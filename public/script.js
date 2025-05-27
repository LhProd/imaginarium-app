document.getElementById("thoughtForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const content = document.getElementById("thoughtInput").value.trim();
  if (!content) return;

  await fetch('/api/thoughts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  });

  document.getElementById("thoughtInput").value = "";
  alert("Thank you for your thoughts!");
});