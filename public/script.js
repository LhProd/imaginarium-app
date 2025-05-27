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

document.getElementById('clearBtn').addEventListener('click', async () => {
  if (!confirm('Are you sure you want to clear all submissions?')) return;

  try {
    const res = await fetch('/api/thoughts', { method: 'DELETE' });
    if (res.ok) {
      loadThoughts();
    } else {
      alert('Failed to clear submissions.');
    }
  } catch (err) {
    console.error('Error clearing thoughts:', err);
  }
});