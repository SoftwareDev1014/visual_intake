'use strict'
var express = require('express');
var router = express.Router();
const crypto = require('crypto')

const uuidv4 = require('uuid/v4')
const AWS = require('aws-sdk')
AWS.config.update({ region: process.env.AWS_REGION || 'us-east-1' })
const s3 = new AWS.S3()

const getUploadURL = async function(fileName) {
  
  const s3Params = {
    Bucket: process.env.UploadBucket,
    Key:  `${fileName}.png`,
    ContentType: 'image/png', // Update to match whichever content type you need to upload
    ACL: 'public-read'      // Enable this setting to make the object publicly readable - only works if the bucket can support public objects
  }

  return new Promise((resolve, reject) => {
    // Get signed URL
    resolve({
      "statusCode": 200,
      "isBase64Encoded": false,
      "headers": {
        "Access-Control-Allow-Origin": "*"
      },
      "body": JSON.stringify({
          "uploadURL": s3.getSignedUrl('putObject', s3Params),
          "photoFilename": `${fileName}.png`
      })
    })
  })
}

router.post('/getUploadURL', async (req, res, next) => {
  if(!req.body.type.includes("eye")){
    res.status(400).send("Wrong parameters")
  }
  let hash = crypto.createHash('md5').update(req.body.type).digest("hex")

  const fileName = hash+"_"+uuidv4()
  try{
    var result = await getUploadURL(fileName)
    if(result){
      result = JSON.parse(result.body)
      console.log(req.body.submissionId, req.body.type, result.uploadURL.split('?')[0])
      res.json(result)
    }
    else{
  
    }  
  }
  catch(err){    
    console.log(err)
    res.status(200).send("Error occured in the backend")
  }
 
  
})


module.exports = router;
