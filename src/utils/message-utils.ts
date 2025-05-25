import { Member } from '@/types/member';

/**
 * Personalize a message for a specific member
 * @param content Message content with placeholders
 * @param member Member to personalize for
 * @returns Personalized message content
 */
export function personalizeMessage(content: string, member: Member): string {
  if (!content || !member) {
    return content || '';
  }

  let personalizedContent = content;

  try {
    // Replace {name} with member's name
    const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim();
    personalizedContent = personalizedContent.replace(/{name}/g, fullName);

    // Also handle [name] format
    personalizedContent = personalizedContent.replace(/\[name\]/g, fullName);

    // Replace {first_name} with member's first name
    const firstName = member.first_name || '';
    personalizedContent = personalizedContent.replace(/{first_name}/g, firstName);

    // Also handle [first_name] format
    personalizedContent = personalizedContent.replace(/\[first_name\]/g, firstName);

    // Also handle {firstName} format (camelCase)
    personalizedContent = personalizedContent.replace(/{firstName}/g, firstName);

    // Also handle [firstName] format (camelCase)
    personalizedContent = personalizedContent.replace(/\[firstName\]/g, firstName);

    // Replace {last_name} with member's last name
    const lastName = member.last_name || '';
    personalizedContent = personalizedContent.replace(/{last_name}/g, lastName);

    // Also handle [last_name] format
    personalizedContent = personalizedContent.replace(/\[last_name\]/g, lastName);

    // Also handle {lastName} format (camelCase)
    personalizedContent = personalizedContent.replace(/{lastName}/g, lastName);

    // Also handle [lastName] format (camelCase)
    personalizedContent = personalizedContent.replace(/\[lastName\]/g, lastName);

    // Add more token replacements here as needed

    console.log('Personalization result:', {
      original: content,
      personalized: personalizedContent
    });
  } catch (error) {
    console.error('Error personalizing message:', error);
  }

  return personalizedContent;
}
