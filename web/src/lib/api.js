// age: const res = await fetch(IK_AUTH_ENDPOINT);
const idToken = await auth.currentUser?.getIdToken?.();
const res = await fetch(`${IK_AUTH_ENDPOINT}?folder=${encodeURIComponent(folder)}`, {
  headers: idToken ? { Authorization: `Bearer ${idToken}` } : {}
});
