interface User {
  name: string;
}

function validateUser(user: User): User {
  const trimmed = user.name.trim();
  if (trimmed.length === 0) {
    throw new Error("user has no name");
  }
  return { name: trimmed };
}

// indirect call: the function arrives through a parameter
function dispatch(handler: (u: User) => User, u: User): User {
  return handler(u);
}

// async: after the await, the original call chain is gone
async function handleSignup(form: User): Promise<User> {
  await Promise.resolve();
  return dispatch(validateUser, { name: form.name });
}

handleSignup({ name: "   " });
