/**
 * Optional: configure the linked Google Form to accept one response per
 * signed-in Google account. Replace the URL with the form's editor URL first.
 */
function configureExamFormForOneResponse() {
  const formUrl = 'PASTE_GOOGLE_FORM_EDIT_URL_HERE';
  if (formUrl.indexOf('PASTE_') === 0) {
    throw new Error('Replace formUrl with the Google Form editor URL before running this function.');
  }

  const form = FormApp.openByUrl(formUrl);
  form.setCollectEmail(true);
  form.setLimitOneResponsePerUser(true);
  form.setShowLinkToRespondAgain(false);

  Logger.log('One response per signed-in Google account is enabled.');
  Logger.log('Student URL: ' + form.getPublishedUrl());
}
