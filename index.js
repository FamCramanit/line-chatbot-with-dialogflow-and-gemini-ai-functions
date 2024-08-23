const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
setGlobalOptions({ maxInstances: 10 });
const line = require("./utils/line");
const gemini = require("./utils/gemini");
const { WebhookClient } = require("dialogflow-fulfillment");
const NodeCache = require("node-cache");
const myCache = new NodeCache();

exports.webhook = onRequest(async (req, res) => {
  if (req.method === "POST") {
    const events = req.body.events;
    for (const event of events) {
      switch (event.type) {
        case "message":
          if (event.message.type === "text") {
            console.log(event.message.text);
            const msg = await gemini.chat(event.message.text);
            await line.reply(event.replyToken, [{ type: "text", text: msg }]);
            return res.end();
          }
          if (event.message.type === "image") {
            const imageBinary = await line.getImageBinary(event.message.id);
            const msg = await gemini.multimodal(imageBinary);
            await line.reply(event.replyToken, [{ type: "text", text: msg }]);
            return res.end();
          }
          break;
      }
    }
  }
  return res.send(req.method);
});

exports.dialogflowFulfillment = onRequest(async (req, res) => {
  console.log("DialogflowFulfillment");
  if (req.method === "POST") {
    var userId =
      req.body.originalDetectIntentRequest.payload.data.source.userId;
    var replyToken =
      req.body.originalDetectIntentRequest.payload.data.replyToken;
    const agent = new WebhookClient({ request: req, response: res });
    console.log("Query " + agent.query);

    console.log("UserId: " + userId);
    var mode = myCache.get(userId);
    console.log("Mode: " + mode);
    if (mode === undefined) {
      mode = "Dialogflow";
    }
    var notifyStatus = myCache.get("Notify" + userId);
    if (notifyStatus === undefined) {
      notifyStatus = true;
    }

    if (agent.query == "เริ่มต้นการสนทนา") {
      mode = "Dialogflow";
      console.log("Change Mode to: " + mode);
      await line.reply(replyToken, [
        {
          type: "text",
          text: "กดที่แป้นพิมพ์แล้วพิมพ์ได้เลยครับ",
        },
      ]);
      myCache.set(userId, mode, 600);
      console.log("Lastest Mode: " + mode);
      return res.end();
    }

    if (agent.query == "ล้างการสนทนา") {
      mode = "Dialogflow";
      console.log("Change Mode to: " + mode);
      await line.reply(replyToken, [
        {
          type: "text",
          text: "พิมพ์ใหม่ได้เลยครับ",
        },
      ]);
      myCache.set(userId, mode, 600);
      console.log("Lastest Mode: " + mode);
      return res.end();
    }

    if (mode == "bot") {
      agent.query = "สอบถามกับ AI" + agent.query;
    } else if (mode == "staff") {
      agent.query = "สอบถามกับ เจ้าหน้าที่" + agent.query;
    }

    if (agent.query.includes("สอบถามกับ เจ้าหน้าที่")) {
      mode = "staff";
      console.log("Change Mode to: " + mode);
      let profile = await line.getUserProfile(userId);
      console.log(profile.data);
      if (notifyStatus) {
        line.notify({
          message:
            "ผู้ใช้ชื่อ " +
            profile.data.displayName +
            " ต้องการติดต่อ " +
            agent.query,
          imageFullsize: profile.data.pictureUrl,
          imageThumbnail: profile.data.pictureUrl,
        });
        await line.reply(replyToken, [
          {
            type: "text",

            text:
              agent.query +
              " เราได้แจ้งเตือนไปยังเจ้าหน้าที่แล้ว เจ้าหน้าที่จะรีบมาตอบนะครับ เวลาทำการของเจ้าหน้าที่คือ 09:00-16:00 น. วันจันทร์-ศุกร์ (หยุดวันหยุดนักขัตฤกษ์)",
          },
        ]);
      }
      myCache.set("Notify" + userId, false, 600);
    } else if (agent.query.includes("สอบถามกับ AI")) {
      mode = "bot";
      console.log("Change Mode to: " + mode);
      let question = agent.query;
      question = question.replace("สอบถามกับ AI", "");
      const msg = await gemini.chat(question);
      await line.reply(replyToken, [
        {
          type: "text",
          sender: {
            name: "Gemini",
            iconUrl: "YOUR GEMINI ICON URL",
          },
          text: msg,
        },
      ]);
    } else {
      mode = "Dialogflow";
      let question = "คุณต้องการสอบถามกับ AI หรือ เจ้าหน้าที่";
      let answer1 = "สอบถามกับ AI " + agent.query;
      let answer2 = "สอบถามกับ เจ้าหน้าที่ " + agent.query;

      await line.reply(replyToken, [
        {
          type: "text",
          text: question,
          sender: {
            name: "Dialogflow",
            
          },
          quickReply: {
            items: [
              {
                type: "action",
                action: {
                  type: "message",
                  label: "สอบถามกับ AI",
                  text: answer1,
                },
              },
              {
                type: "action",
                action: {
                  type: "message",
                  label: "สอบถามกับ เจ้าหน้าที่",
                  text: answer2,
                },
              },
            ],
          },
        },
      ]);
    }
    myCache.set(userId, mode, 600);
    console.log("Lastest Mode: " + mode);
  }

  return res.send(req.method);
});