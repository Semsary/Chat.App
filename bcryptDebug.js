import bcrypt from "bcrypt";

const debugBcrypt = async () => {
  // Step 1: Define test data
  const rawPassword = "userpassword123";
  const storedHash =
    "$2a$10$c5RtoRXA.VJd0iMKVW7c1.5Hsh2wIkujCVodsNofTPGr87Tz6ySfi";

  console.log("===== Debugging bcrypt =====");

  // Step 2: Generate a new hash for the raw password
  console.log("Raw Password:", rawPassword);
  console.log("Stored Hash from Database:", storedHash);

  try {
    console.log("\nStep 1: Hashing the raw password...");
    const newHash = await bcrypt.hash(rawPassword, 10);
    console.log("Newly Generated Hash:", newHash);

    // Step 3: Compare the raw password with the stored hash
    console.log("\nStep 2: Comparing raw password with the stored hash...");
    const comparisonResult = await bcrypt.compare(rawPassword, storedHash);
    console.log(
      "Password Comparison Result (Should be true):",
      comparisonResult
    );

    // Step 4: Compare the raw password with the newly generated hash
    console.log(
      "\nStep 3: Comparing raw password with the newly generated hash..."
    );
    const newComparisonResult = await bcrypt.compare(rawPassword, newHash);
    console.log(
      "Password Comparison Result with Newly Generated Hash (Should be true):",
      newComparisonResult
    );

    // Step 5: Direct character-by-character comparison
    console.log("\nStep 4: Direct string comparison of stored hash...");
    console.log(
      "Does stored hash match newly generated hash? (Should be false):",
      storedHash === newHash
    );
  } catch (error) {
    console.error("Error during bcrypt debugging:", error);
  }

  console.log("\n===== End of Debugging =====");
};

debugBcrypt();
