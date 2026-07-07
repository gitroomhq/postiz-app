const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function makeId(length = 16) {
  let result = '';

  for (let index = 0; index < length; index += 1) {
    result += ID_CHARS.charAt(Math.floor(Math.random() * ID_CHARS.length));
  }

  return result;
}
