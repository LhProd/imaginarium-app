window.addEventListener("DOMContentLoaded", () => {
  const promptEl = document.querySelector(".prompt");

  async function loadPrompt(highlightChange = false) {
    try {
      const res = await fetch('/api/prompt');
      const data = await res.json();
      if (promptEl) {
        if (promptEl.textContent !== data.text) {
          promptEl.textContent = data.text;

          if (highlightChange) {
            promptEl.style.transition = 'background-color 0.4s ease';
            promptEl.style.backgroundColor = '#ffff99';
            setTimeout(() => {
              promptEl.style.backgroundColor = '';
            }, 800);
          }
        }
      } else {
        console.warn("Prompt element not found.");
      }
    } catch (err) {
      console.error("Failed to load prompt:", err);
    }
  }

  // Initial prompt load
  loadPrompt();

  // Refresh prompt every 60 seconds
  setInterval(() => loadPrompt(true), 60000);

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