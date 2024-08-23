const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// In case you use text only //

//  const textOnly = async (prompt) => {
//    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
//    const result = await model.generateContent(prompt);
//    return result.response.text();
// }; 

// For describe photo and you can add prompt to that //

// const multimodal = async (imageBinary) => {
//    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
//    const prompt = "ช่วยบรรยายภาพนี้ให้หน่อย";
//    const mimeType = "image/png";

//    const imageParts = [
//        {
//            inlineData: {
//                data: Buffer.from(imageBinary, "binary").toString("base64"),
//                mimeType
//            }
//        }
//    ];
//   const result = await model.generateContent([prompt, ...imageParts]);
//    const text = result.response.text();
//    return text;
// };

const chat = async (prompt) => {
    // For text-only input, use the gemini-pro model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    return result.response.text();
};


module.exports = { textOnly, multimodal, chat };