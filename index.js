
/*
 * Route: api.innovationbound.com/services/training/chatgpt/massive
 * Subscribes email to chatgpt-training-business-owners-only sequence, and sends welcome email
 * Reads email, creates db subscribe, sends welcome email, responds {event.body.confirmation}
 */

var fs = require('fs').promises
var aws = require('aws-sdk')
    aws.config.update({region: 'us-east-1'})
var ses = new aws.SES()
var db = new aws.DynamoDB.DocumentClient()
var replyToAddress = "Innovation Bound <hello@innovationbound.com>"

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return respond(204) // For OPTIONS preflight
  try {
    var json = JSON.parse(event.body)
    var email = json.subscription.email ?? null
    var list = json.subscription.list ?? 'chatgpt-training-business-owners-only'


    // Validate incoming data
    console.log(`Validating email sequence subscription for ${email} to ${list}.`)

    if (!email) return respond(400, {error: 'Email is required.'})
    if (email.match(/@/) == null) return respond(400, {error: 'Please provide a valid email.'})

    var user = await db.get({
      TableName: "www.innovationbound.com",
      Key: { pk: `email-list#chatgpt-training-business-owners-only`, sk: email }
    }).promise()

    if (user.Item) {
      return respond(400, {error: 'You are already subscribed to the Free ChatGPT Training for Massive Business Growth list.'})
    }

    // Email data
    console.log(`Sending welcome email to ${email}.`)

    var rawHtml = await fs.readFile("email.html", "utf8")
    var rawTxt = await fs.readFile("email.txt", "utf8")

    // Replace {{unsubscribe}} and {{niche}}
    var html = rawHtml.replace(/{{unsubscribe}}/, `https://www.innovationbound.com/unsubscribe?email=${email}&list=${list}&edition=0`)
    var txt = rawTxt.replace(/{{unsubscribe}}/, `https://www.innovationbound.com/unsubscribe?email=${email}&list=${list}&edition=0`)

    var confirm = await ses.sendEmail({
      Destination: { ToAddresses: [email] },
      Message: {
        Body: {
          Html: { Charset: "UTF-8", Data: html },
          Text: { Charset: "UTF-8", Data: txt }
        },
        Subject: { Charset: "UTF-8", Data: `💻 Welcome to Innovation Bound's free ChatGPT Training for Massive Business Growth` }
      },
      ReplyToAddresses: [replyToAddress],
      ReturnPath: replyToAddress,
      Source: replyToAddress
    }).promise()


    // Store list subscription
    var subscribed = await db.put({
      TableName: "www.innovationbound.com",
      Item: {
        pk: `email-list#chatgpt-training-business-owners-only`,
        sk: email,
        email: email,
        sequence: true,
        nextEmail: 1,
        "email-list": list,
        graduatesTo: "ai-superpowers",
        subscribed: new Date().toJSON()
      }
    }).promise()


    // Respond
    return respond(200, {message: `Confirmed! Free ChatGPT Training welcome message sent to ${email}.`})
  } catch (error) {
    console.log(error)
    return respond(500, {error: `500 - Something went wrong with ${email}'s subscription to ${list}.`})
  }
}

function respond (code, message) {
  return {
    body: code === 204 ? '' : JSON.stringify(message),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin' : 'https://www.innovationbound.com',
      'Access-Control-Allow-Methods' : 'POST,OPTIONS',
      'Access-Control-Allow-Headers' : 'Accept, Content-Type, Authorization',
      'Access-Control-Allow-Credentials' : true
    },
    isBase64Encoded: false,
    statusCode: code
  }
}

