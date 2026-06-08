import { validateUser, type User } from "./user";

function handleSignup(form: User): User {
  return validateUser({ name: form.name });
}
function test() {
  handleSignup({ name: "   " });
}

test();
