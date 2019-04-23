const SLASH = '/';
const BACK_SLASH = '\\';
const STAR = '*';
const DOUBLE_QUOTE = '"';
const SINGLE_QUOTE = "'";
const NEW_LINE = '\n';
const CARRIAGE_RETURN = '\r';

export function stripComments(value: string) {
  let position = 0;
  const output = [];
  const length = value.length;

  const getCurrentCharacter = () => value.charAt(position);
  const getPreviousCharacter = () => value.charAt(position - 1);
  const getNextCharacter = () => value.charAt(position + 1);
  const add = () => output.push(getCurrentCharacter());
  const next = () => ++position;
  const atEnd = () => position >= length;

  const isEscaping = () => {
    if (getPreviousCharacter() == BACK_SLASH) {
      let offset = 1;
      let escaped = true;
      while (position - offset > 0) {
        escaped = !escaped;
        const current = position - offset;
        if (value.charAt(current) != BACK_SLASH) {
          return escaped;
        }
        offset++;
      }
      return escaped;
    }
    return false;
  };

  const processSingleQuotedString = () => {
    if (getCurrentCharacter() == SINGLE_QUOTE) {
      add();
      next();
      while (!atEnd()) {
        if (getCurrentCharacter() == SINGLE_QUOTE && !isEscaping()) {
          return;
        }
        add();
        next();
      }
    }
  };

  const processDoubleQuotedString = () => {
    if (getCurrentCharacter() == DOUBLE_QUOTE) {
      add();
      next();
      while (!atEnd()) {
        if (getCurrentCharacter() == DOUBLE_QUOTE && !isEscaping()) {
          return;
        }
        add();
        next();
      }
    }
  };

  const processSingleLineComment = () => {
    if (getCurrentCharacter() == SLASH) {
      if (getNextCharacter() == SLASH) {
        next();
        while (!atEnd()) {
          next();
          if (getCurrentCharacter() == NEW_LINE || getCurrentCharacter() == CARRIAGE_RETURN) {
            return;
          }
        }
      }
    }
  };

  const processMultiLineComment = () => {
    if (getCurrentCharacter() == SLASH) {
      if (getNextCharacter() == STAR) {
        next();
        while (!atEnd()) {
          next();
          if (getCurrentCharacter() == STAR) {
            if (getNextCharacter() == SLASH) {
              next();
              next();
              return;
            }
          }
        }
      }
    }
  };

  const processRegex = () => {
    if (getCurrentCharacter() == SLASH) {
      if (getNextCharacter() != STAR && getNextCharacter() != SLASH) {
        while (!atEnd()) {
          add();
          next();
          if (getCurrentCharacter() == SLASH && !isEscaping()) {
            return;
          }
        }
      }
    }
  };

  while (!atEnd()) {
    processRegex();
    processDoubleQuotedString();
    processSingleQuotedString();
    processSingleLineComment();
    processMultiLineComment();
    if (!atEnd()) {
      add();
      next();
    }
  }

  return output.join('');
}
