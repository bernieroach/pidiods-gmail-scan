// GLOBALS
const scriptProperties = PropertiesService.getScriptProperties();
var fileTypesToExtract = JSON.parse(scriptProperties.getProperty("extractableFiles"));
var sentLabelName = scriptProperties.getProperty("sentLabelName");
var errorLabelName = scriptProperties.getProperty("errorLabelName");
var processingLabelName = scriptProperties.getProperty("processingLabelName");
var url = scriptProperties.getProperty("url");

function GmailToPostUrl() {
  var query = buildQuery_(fileTypesToExtract);
  var sentLabel = getGmailLabel_(sentLabelName);
  var errorLabel = getGmailLabel_(errorLabelName);
  var processingLabel = getGmailLabel_(processingLabelName);
  var threads = GmailApp.search(query);
  if (threads.length === 0) {
    return;
  }
  for (var i in threads) {
    threads[i].addLabel(processingLabel);
    var files = [];
    var mesgs = threads[i].getMessages();
    for (var j in mesgs) {
      if (!mesgs[j].isUnread()) {
        continue;
      }
      var attachments = mesgs[j].getAttachments();
      for (var k in attachments) {
        var attachment = attachments[k];
        if (attachment.getContentType().includes("image")) {
          continue;
        }
        files.push(buildFileData_(attachment)); 
      }
      mesgs[j].markRead();
    }
    var sent = sendFilesToUrl_(files, url);
    threads[i].removeLabel(processingLabel);
    threads[i].markRead();
  }
}

function getGmailLabel_(name) {
  var label = GmailApp.getUserLabelByName(name);
  if (!label) {
    label = GmailApp.createLabel(name);
  }
  return label;
}

function buildQuery_(fileTypesToExtract) {
  var query;
  for (var i in fileTypesToExtract) {
    query +=
      query === ""
        ? "filename:" + fileTypesToExtract[i]
        : " OR filename:" + fileTypesToExtract[i];
  }
  query = "in:inbox has:nouserlabels " + query;
  return query;
}

function buildFileData_(attachment) {
  
  var fileSplit = attachment.getName().split("-");
  var user_id = fileSplit.shift().trim();
  var filetype = attachment.getName().split(".").pop();
  var base64EncodedFile = Utilities.base64Encode(attachment.getBytes());
  var patient_name = fileSplit[0].split(' ').join('');
  patient_name = patient_name.split(',').join('_');
  Logger.log(attachment.getName() + ' FT:  ' + filetype + ' PN: '  + patient_name + ' U: ' + user_id + ' TYP: ' + attachment.getContentType());

  return {
    data: base64EncodedFile,
    rawdata: attachment.getBytes(),
    filesize: attachment.getSize(),
    filename: attachment.getName(),
    patient_name: patient_name,
    user_id: user_id,
    filetype: filetype,
  };
}

function sendFilesToUrl_(files, url) {
  var data = {
    files: files,
  };
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(data),
  };
  Logger.log("sending to: " + url);
  try {
    var response = UrlFetchApp.fetch(url, options);
    Logger.log(response.getContentText());
    return true;
  } catch (error) {
    Logger.log('boom');
    Logger.log(error);
    Logger.log('boom');
    return false;

  }
  
}
