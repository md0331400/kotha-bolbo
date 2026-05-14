// api/send-notification.js

export default async function handler(req, res){

if(req.method!=="POST"){
return res.status(405).json({error:"Method not allowed"});
}

try{

const {message,sender}=req.body;

const response = await fetch(
"https://onesignal.com/api/v1/notifications",
{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:`Basic ${process.env.ONESIGNAL_REST_API_KEY}`
},
body:JSON.stringify({
app_id:process.env.ONESIGNAL_APP_ID,
included_segments:["Subscribed Users"],
headings:{en:"New Message"},
contents:{en:`${sender}: ${message}`},
url:"/"
})
});

const data=await response.json();

res.status(200).json(data);

}catch(err){
res.status(500).json({error:err.message});
}
}
