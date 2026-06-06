(() => {
  // src/user.ts
  function validateUser(user) {
    const trimmed = user.name.trim();
    if (trimmed.length === 0) {
      throw new Error("user has no name");
    }
    return { name: trimmed };
  }

  // src/index.ts
  function handleSignup(form) {
    return validateUser({ name: form.name });
  }
  handleSignup({ name: "   " });
})();
//# sourceMappingURL=app.js.map
