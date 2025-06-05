window.addEventListener("DOMContentLoaded", () => {
  // Handle prompt loading
  fetch('/api/prompt')
    .then(res => res.json())
    .then(data => {
      const promptEl = document.querySelector(".prompt");
      if (promptEl) {
        promptEl.textContent = data.text;
      } else {
        console.warn("Prompt element not found.");
      }
    })
    .catch(err => {
      console.error("Failed to load prompt:", err);
    });

  // Handle thought submission
  const form = document.getElementById("thoughtForm");
  const input = document.getElementById("thoughtInput");

  if (form && input) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const content = input.value.trim();
      if (!content) return;

      await fetch('/api/thoughts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      input.value = "";
      alert("Thank you for your thoughts!");
    });
  }

  // Optional clear button (only if it exists on the page)
  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to clear all submissions?')) return;

      try {
        const res = await fetch('/api/thoughts', { method: 'DELETE' });
        if (res.ok) {
          if (typeof loadThoughts === 'function') loadThoughts();
        } else {
          alert('Failed to clear submissions.');
        }
      } catch (err) {
        console.error('Error clearing thoughts:', err);
      }
    });
  }
});