/**
 * Smart Reply Generator
 * Provides 3 contextual quick-reply options for chat bubbles
 */

function generateSmartReplies(normalizedText, isQuestion = false) {
  if (!normalizedText) return [];

  const text = normalizedText.toLowerCase().trim();

  // Questions
  if (text.includes('what are you doing') || text.includes('what are you up to')) {
    return ['Not much, chilling!', 'Working on a project.', 'Just having some tea/coffee.'];
  }

  if (text.includes('where are you')) {
    return ['On my way!', 'At home right now.', 'Almost there!'];
  }

  if (text.includes('how are you')) {
    return ['I am doing great, thanks!', 'All good here, and you?', 'Doing well!'];
  }

  if (text.includes('what is the plan') || text.includes('what’s the plan') || text.includes('what is the scene')) {
    return ['Let’s catch up tonight!', 'No plans yet, what about you?', 'Up for anything!'];
  }

  if (text.includes('shall we go for tea') || text.includes('shall we grab') || text.includes('coffee')) {
    return ['Yes, let’s go!', 'Give me 10 minutes.', 'Can we do it tomorrow?'];
  }

  if (text.includes('when are you hosting') || text.includes('party')) {
    return ['This weekend for sure!', 'Soon! Deciding the date.', 'Whenever everyone is free!'];
  }

  if (text.includes('can you call me') || text.includes('when you are free')) {
    return ['Calling you in 5 minutes.', 'Free right now!', 'Will call you this evening.'];
  }

  // Greetings
  if (text.includes('good morning')) {
    return ['Good morning! Have a great day.', 'Morning! How are you?', 'Good morning! 😊'];
  }

  if (text.includes('good night') || text.includes('sleep well')) {
    return ['Good night! Sleep well.', 'Sweet dreams! 🌙', 'Good night!'];
  }

  if (text.includes('thank you') || text.includes('thanks')) {
    return ['You’re very welcome!', 'Anytime! 👍', 'Glad I could help!'];
  }

  // Confirmations & Agreements
  if (text.includes('meet tomorrow') || text.includes('see you tomorrow')) {
    return ['Sounds great, see you!', 'What time works for you?', 'Perfect!'];
  }

  if (text.includes('won’t be able to come') || text.includes('cannot come')) {
    return ['No worries at all!', 'Take care, let’s reschedule.', 'Hope everything is okay.'];
  }

  if (text.includes('it is done') || text.includes('it’s done') || text.includes('finished')) {
    return ['Awesome, thank you!', 'Great job!', 'Thanks for the update.'];
  }

  if (text.includes('on my way') || text.includes('omw')) {
    return ['Drive safely!', 'See you soon!', 'Take your time.'];
  }

  if (isQuestion) {
    return ['Yes, absolutely!', 'Let me check and get back to you.', 'Not sure yet.'];
  }

  return ['Sounds good!', 'Got it, thank you!', 'Perfect.'];
}

module.exports = {
  generateSmartReplies
};
