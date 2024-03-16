import removeMd from 'remove-markdown';
import { makeId } from '../../../nestjs-libraries/src/services/make.is';

export const removeMarkdown = (params: { text: string; except?: RegExp[] }) => {
  let modifiedText = params.text;
  const except = params.except || [];
  const placeholders: { [key: string]: string } = {};

  // Step 2: Replace exceptions with placeholders
  except.forEach((regexp, index) => {
    modifiedText = modifiedText.replace(regexp, (match) => {
      const placeholder = `[[EXCEPT_PLACEHOLDER_${makeId(5)}]]`;
      placeholders[placeholder] = match;
      return placeholder;
    });
  });

  // Step 3: Remove markdown from modified text
  // Assuming removeMd is the function that removes markdown
  const cleanedText = removeMd(modifiedText);

  // Step 4: Replace placeholders with original text
  const finalText = Object.keys(placeholders).reduce((text, placeholder) => {
    return text.replace(placeholder, placeholders[placeholder]);
  }, cleanedText);

  return finalText;
};
