
/*
 * Route: api.innovationbound.com/services/training/chatgpt/accelerator/apply
 * Processes application for AI Accelerator and sends application confirmation email
 * Reads email, creates db entry, sends confirmation email, responds {event.body.confirmation}
 */

var fs = require('fs').promises
var aws = require('aws-sdk')
    aws.config.update({region: 'us-east-1'})
var ses = new aws.SES()
var db = new aws.DynamoDB.DocumentClient()
var replyToAddress = "Innovation Bound <support@innovationbound.com>"

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return respond(204) // For OPTIONS preflight
  try {
    var json = JSON.parse(event.body)
    var name = json.application.name ?? null
    var email = json.application.email ?? null
    var website = json.application.website ?? null
    var linkedin = json.application.linkedin ?? null

    // Validate incoming data
    console.log(`Validating email sequence application for ${email} to ${list}.`)

    if (!name) return respond(400, {error: 'Name is required.'})
    if (!email) return respond(400, {error: 'Email is required.'})
    if (email.match(/@/) == null) return respond(400, {error: 'Please provide a valid email.'})
    if (!website) return respond(400, {error: 'Company Website is required.'})
    if (!linkedin) return respond(400, {error: 'LinkedIn Profile is required.'})

    var applicant = await db.get({
      TableName: "www.innovationbound.com",
      Key: { pk: `application#ai-accelerator`, sk: email }
    }).promise()

    if (applicant.Item) {
      return respond(400, {error: 'You have already applied to the the 2026 AI Accelerator.'})
    }

    // Email data
    console.log(`Sending confirmation email to ${email}.`)

    var rawHtml = await fs.readFile("email.html", "utf8")
    var rawTxt = await fs.readFile("email.txt", "utf8")

    // Replace {{unsubscribe}} and {{niche}}
    var html = rawHtml.replace(/{{emailSettings}}/, `https://www.innovationbound.com/unsubscribe?email=${email}&list=${list}&edition=0`)
    var txt = rawTxt.replace(/{{emailSettings}}/, `https://www.innovationbound.com/unsubscribe?email=${email}&list=${list}&edition=0`)

    var confirm = await ses.sendEmail({
      Destination: { ToAddresses: [email] },
      Message: {
        Body: {
          Html: { Charset: "UTF-8", Data: html },
          Text: { Charset: "UTF-8", Data: txt }
        },
        Subject: { Charset: "UTF-8", Data: `📋 Application Confirmed for Innovation Bound's 2026 AI Accelerator - We'll respond in 3 days` }
      },
      ReplyToAddresses: [replyToAddress],
      ReturnPath: replyToAddress,
      Source: replyToAddress
    }).promise()


    // Store list application
    var applied = await db.put({
      TableName: "www.innovationbound.com",
      Item: {
        pk: `application#ai-accelerator`,
        sk: email,
        name: name,
        email: email,
        website: website,
        linkedinlinkedinemail,
        applied: new Date().toJSON()
      }
    }).promise()


    // Respond
    return respond(200, {message: `Application confirmed for ${name}, ${email}.`})
  } catch (error) {
    console.log(error)
    return respond(500, {error: `500 - Something went wrong with ${email || ''}'s application for the 2026 AI Accelerator.`})
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

