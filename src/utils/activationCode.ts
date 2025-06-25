export const generateActivationCode = (): string => {
  // Generate a 6-digit numeric code
  return Math.floor(100000 + Math.random() * 900000).toString();
};