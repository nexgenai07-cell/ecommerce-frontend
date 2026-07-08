// Utility function to check password strength
// Used on the Register page to show real-time password strength
// Checks against industry standard requirements

// Password strength levels
export const PASSWORD_STRENGTH = {
  WEAK: "weak",
  MEDIUM: "medium",
  STRONG: "strong",
};

// Password requirements — strength is decided by checking these
export const PASSWORD_REQUIREMENTS = [
  {
    id: "length", // Unique identifier for this requirement
    label: "At least 8 characters", // Text shown to the user describing this rule
    test: (pwd) => pwd.length >= 8, // Function that checks if the password is at least 8 characters long
  },
  {
    id: "uppercase", // Unique identifier for this requirement
    label: "One uppercase letter (A-Z)", // Text shown to the user describing this rule
    test: (pwd) => /[A-Z]/.test(pwd), // Function that checks if the password contains at least one uppercase letter
  },
  {
    id: "lowercase", // Unique identifier for this requirement
    label: "One lowercase letter (a-z)", // Text shown to the user describing this rule
    test: (pwd) => /[a-z]/.test(pwd), // Function that checks if the password contains at least one lowercase letter
  },
  {
    id: "number", // Unique identifier for this requirement
    label: "One number (0-9)", // Text shown to the user describing this rule
    test: (pwd) => /[0-9]/.test(pwd), // Function that checks if the password contains at least one digit
  },
  {
    id: "special", // Unique identifier for this requirement
    label: "One special character (!@#$)", // Text shown to the user describing this rule
    test: (pwd) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd), // Function that checks if the password contains at least one special character
  },
];

// Function to calculate the password strength
// 0-2 requirements met = weak
// 3-4 requirements met = medium
// 5 requirements met = strong
export const getPasswordStrength = (password) => {
  if (!password) return null; // If there is no password, return null (no strength to show)

  // Count how many requirements are met
  const metCount = PASSWORD_REQUIREMENTS.filter(
    (req) => req.test(password), // Run each requirement's test function against the password
  ).length; // Count how many tests passed

  if (metCount <= 2) return PASSWORD_STRENGTH.WEAK; // 2 or fewer requirements met means weak password
  if (metCount <= 4) return PASSWORD_STRENGTH.MEDIUM; // 3 or 4 requirements met means medium password
  return PASSWORD_STRENGTH.STRONG; // All 5 requirements met means strong password
};

// Function to generate a strong password
// Mixes uppercase, lowercase, numbers, and special characters
export const generateStrongPassword = () => {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; // String of all uppercase letters to pick from
  const lowercase = "abcdefghijklmnopqrstuvwxyz"; // String of all lowercase letters to pick from
  const numbers = "0123456789"; // String of all digits to pick from
  const special = "!@#$%^&*"; // String of special characters to pick from
  const all = uppercase + lowercase + numbers + special; // Combine all characters together into one pool

  let password = ""; // Start with an empty password string

  // Add at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)]; // Add one random uppercase letter
  password += lowercase[Math.floor(Math.random() * lowercase.length)]; // Add one random lowercase letter
  password += numbers[Math.floor(Math.random() * numbers.length)]; // Add one random number
  password += special[Math.floor(Math.random() * special.length)]; // Add one random special character

  // Fill the remaining 8 characters randomly from the combined pool
  for (let i = 0; i < 8; i++) {
    // Loop 8 times to add 8 more characters
    password += all[Math.floor(Math.random() * all.length)]; // Add one random character from the full pool each time
  }

  // Shuffle the characters so the pattern isn't obvious
  return password
    .split("") // Split the password string into an array of individual characters
    .sort(() => Math.random() - 0.5) // Randomly reorder the characters
    .join(""); // Join the characters back into a single string
};
