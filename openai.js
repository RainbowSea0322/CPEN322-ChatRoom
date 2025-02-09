
const Database = require('./Database.js');
const mongoUrl = 'mongodb://127.0.0.1:27017/';
const dbName = 'cpen322-messenger';
let db = new Database(mongoUrl, dbName);
const OPENAI_API_KEY = '';
const OpenAI = require("openai");
const openai = new OpenAI({
    apiKey: "",
  });

const eventSession ={
	eventSessions: {},

	updateEventHistory : function (username, roomId, eventsArray){
		const key = `${username}+${roomId}`;
		this.eventSessions[key] = eventsArray;
	},

	getEventHistory : function(username, roomId, index){
		const key = `${username}+${roomId}`;
		if(!this.eventSessions[key]){
			return null;
		}
		let events = this.eventSessions[key];
		return events[index];
	}
} 
const aiSupport = {

    generateSummary : async function  (user, roomId){
        let history = await db.getUserLost(user, roomId);
        if(history.length === 0){
            return [];
        }
        let formattedHistory = history.map(msg => `${msg.username}: ${msg.text}`).join('\n');
        let promptHead = "The following is a conversational history in a chat room. Please analyze the content of the conversation and summarize what topics or main points are covered in the chat history:\n\nConversational history:\n";
        let promptEnd = "\n\nBased on the conversation history provided above, summarize the three main topics that were discussed the most. Make sure each topic just one sentence. Use '///' to separate different main topics. For each different event or topic, provide a short summary of its content. Also for each summary don't include any numerical index, start the summary with '-', make sure separate different main topics with '///', do not use '/n' separate different main topics ";
    
        let prompt = promptHead + formattedHistory + promptEnd
    
        //let testPrompt = "As an academic advising chatbot for students at UBC Sauder School of Business, your primary role is to assist with course selection and academic advising queries, specifically tailored to the BCOM program at UBC Sauder. The accuracy of your responses is vital, as they have a significant impact on students' academic progress. \n\nHere is the conversational history (between the user and you) prior to the question. It could be empty if there is no history:\n<history>\n</history>\n\nHere is the information from the database:\n<information>\n</information>\n\nHere are some important rules for the interaction:\nAlways stay in character, as CONCIS-E, an academic advising chatbot for students at UBC Sauder School of Business.\nWhen responding to the following question, your answer should be based entirely on the database information provided. If the information at hand is insufficient to form a complete answer, say \" I'm sorry ......  \"\n\nHere is the user query: what is the second-year requirement for sauder BCom"
        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{role : "user", content : prompt}],
                max_tokens: 150,
                temperature: 0.5,
                presence_penalty: 0.8,
            });
            if(typeof(response.data) === undefined){
                return [];
            }
            const generatedSummary = response.choices[0].message.content;
            let eventsArray = generatedSummary.split('///');
            eventSession.updateEventHistory(user, roomId, eventsArray);
            return eventsArray;
        } catch (error) {
            console.error('Error calling OpenAI API:', error); 
            throw new Error('Internal Server Error');
        }
        
    },
    
    autoReply : async function (user, roomId, eventSummary){
        let promptHead = "The following is summary of a conversational history in a chat room, generate a polite and engaging reply that acknowledges the main points discussed and offers further insight or asks a relevant question to continue the conversation. "
        let promptEnd = "\n\nBased on the summary provided above, generate a one sentence response that addresses the main points discussed in the summary, maintains a friendly and engaging tone throughout. make sure it no more than 25 english words"
        let prompt = promptHead + eventSummary + promptEnd
        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{role : "user", content : prompt}],
                max_tokens: 50,
                temperature: 0.5,

            });
    
            return response.choices[0].message.content
        } catch (error) {
            console.error('Error calling OpenAI API:', error);
            throw new Error('Internal Server Error');
        }
    },
    
    aiReward : async function (user, roomId, event, status){
        let promptHead = "The following is summary of a conversational history in a chat room, generate a polite and engaging reply that acknowledges the main points discussed and offers further insight or asks a relevant question to continue the conversation.";
        let promptEnd;
        if (typeof status !== 'number') {
            status = Number(status);
        }
        if(status === 1){
            promptEnd = "\n\nBased on the summary provided above, generate a short, no more than 25 words response, providing solutions or further information on the points discussed in the summary, ensuring that the response is more closely aligned with the points discussed than the responses provided previously.";
        }else if (status === 2){
            promptEnd = "\n\nBased on the summary provided above, generate a short, no more than 25 words response that addresses the main points discussed in the summary, offers solutions or further information, and ensures that the response is gentler than the one provided previously.";
        }else{
            promptEnd = "\n\nBased on the summary provided above, generate a short, no more than 25 words tough response, providing solutions or further information on the main points discussed in the summary, ensuring that the response contains more anger than the one provided previously, make sure the length of new reply is around 15 words.";
        }
    
        let prompt = promptHead + event + promptEnd;
    
        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{role : "user", content : prompt}],
                max_tokens: 50,
                temperature: 1.5,
                presence_penalty: 0.8,
            });
    
            return response.choices[0].message.content
        } catch (error) {
            console.error('Error calling OpenAI API:', error);
            throw new Error('Internal Server Error');
        }
    
    }
}

module.exports = {aiSupport, eventSession};