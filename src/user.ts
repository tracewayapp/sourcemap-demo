export interface User {
  name: string;
}

export function validateUser(user: User): User {
  const trimmed = user.name.trim();
  if (trimmed.length === 0) {
    throw new Error("user has no name");
  }
  return { name: trimmed };
}
