export interface Chat  {
   _id: string,
   participants: Array<string>
   messages: Array<Message>
}


// A message has some text content, an author and a timestamp
//
export interface Message {
   content: string;
   timestamp: Date;
   author: string;
}