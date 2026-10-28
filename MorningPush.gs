// MorningPush.gs
// Add this as a NEW file in your existing Apps Script project (File + > Script).

// Your website address (where the app lives), with https://
const SITE_URL = "https://YOUR-WEBSITE-ADDRESS/";

// Your own data endpoint (same URL as API_URL in index.html)
const DATA_URL = "https://script.google.com/macros/s/AKfycbysSI1gkrbgL30lrktGCDoypFJ6nZiOR9Kk1GiOeBGr6YPLnj4i_WqnLdPgSfc67KG5/exec";

function sendMorningPush() {
  const props = PropertiesService.getScriptProperties();
  const appId = props.getProperty("ONESIGNAL_APP_ID");
  const apiKey = props.getProperty("ONESIGNAL_API_KEY");
  if (!appId || !apiKey) {
    throw new Error("Add ONESIGNAL_APP_ID and ONESIGNAL_API_KEY under Project Settings > Script properties.");
  }

  let title = "Sri Lanka Air Brief";
  let message = "Good morning! Check today's aviation news.";

  // Try to put the latest headline in the message. Falls back to the plain text above.
  try {
    const res = UrlFetchApp.fetch(DATA_URL + "?action=data", { muteHttpExceptions: true, followRedirects: true });
    const data = JSON.parse(res.getContentText());
    const articles = (data && data.articles) || [];
    if (articles.length) {
      const dayAgo = Date.now() - 24 * 3600000;
      const fresh = articles.filter(function (a) {
        return a.publishedAt && new Date(a.publishedAt).getTime() >= dayAgo;
      }).length;
      const top = String(articles[0].headline || "").trim();
      if (top) {
        message = (fresh ? fresh + " new stories. " : "") + "Top: " + top;
        if (message.length > 160) message = message.slice(0, 157) + "...";
      }
    }
  } catch (e) {
    console.log("Headline fetch failed, sending default text: " + e);
  }

  const payload = {
    app_id: appId,
    target_channel: "push",
    included_segments: ["Subscribed Users"],
    headings: { en: title },
    contents: { en: message },
    url: SITE_URL
  };

  const resp = UrlFetchApp.fetch("https://api.onesignal.com/notifications?c=push", {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Key " + apiKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  console.log(resp.getResponseCode() + " " + resp.getContentText());
}

// Run this ONCE to schedule the daily send around 9 AM.
// (Set the project time zone to Asia/Colombo first: Project Settings > Time zone.)
function setupMorningTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "sendMorningPush") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("sendMorningPush").timeBased().everyDays(1).atHour(9).nearMinute(0).create();
}
