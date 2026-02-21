document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector("#cod-btn");
  const popup = document.querySelector("#cod-popup");
  const closeBtn = document.querySelector("#closeCodForm");
  const form = document.querySelector("#codOrderForm");
  const submitBtn = form?.querySelector('button[type="submit"]');

  const originalBtnText = submitBtn?.textContent || "Place Order";

  if (!btn || !popup || !form) {
    console.error("Required COD elements not found");
    return;
  }

  const messagePopup = document.querySelector("#message-popup");
  const messageText = document.querySelector("#message-text");
  const messageClose = document.querySelector("#message-close");

  function showMessage(type, text, duration = 4000) {
    messageText.textContent = text;

    const box = messagePopup.querySelector(".message-box");
    box.classList.remove("success", "error", "info");
    box.classList.add(type);

    messagePopup.classList.add("show");

    clearTimeout(messagePopup.timer);

    messagePopup.timer = setTimeout(() => {
      messagePopup.classList.remove("show");
    }, duration);
  }

  messageClose.addEventListener("click", () => {
    messagePopup.classList.remove("show");
  });

  // Show popup
  btn.addEventListener("click", () => {
    popup.classList.add("active");
    form.querySelector('input[name="name"]')?.focus();
  });

  // Close popup
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      popup.classList.remove("active");
      form.reset();
    });
  }

  // Close popup on outside click
  popup.addEventListener("click", (e) => {
    if (e.target === popup) {
      popup.classList.remove("active");
    }
  });

  // Close popup on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && popup.classList.contains("active")) {
      popup.classList.remove("active");
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = Object.fromEntries(new FormData(form).entries());

    // Basic validation
    if (!formData.name || !formData.phone || !formData.address) {
      showMessage("error", "Please fill in all required fields");
      return;
    }

    if (formData.phone.length < 10) {
      showMessage("error", "Please enter a valid phone number");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Processing...";
    }

    try {
      const res = await fetch("/apps/cod", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(formData),
      });

      let result;
      try {
        result = await res.json(); // read body ONCE as JSON
      } catch (parseError) {
        const text = await res.text().catch(() => "");
        console.log("Raw response text:", text);
        console.error("Failed to parse JSON from server:", parseError);
        throw new Error(`Server returned invalid data. Status: ${res.status}`);
      }

      // Handle success/error based on JSON + HTTP status
      if (!res.ok || !result.success) {
        // Prefer a human-readable message from the backend
        let errorMsg =
          result?.message || result?.error || "Order failed. Please try again.";

        // If details is an array of userErrors, append the first message (optional)
        if (
          Array.isArray(result?.details) &&
          result.details.length > 0 &&
          result.details[0].message
        ) {
          errorMsg += `: ${result.details[0].message}`;
        }

        showMessage("error", errorMsg);
        return;
      }

      // Success
      const successMsg =
        result.message ||
        (result.orderId
          ? `Order #${result.orderId} placed successfully!`
          : "Order placed successfully!");

      showMessage("success", successMsg);
      function trackMetaPixelPurchaseWithRetry() {
        if (typeof fbq === "function") {
          console.log("fbq defined:", true); // Log that fbq is defined
          console.log("Purchase Event Data:", {
            value: parseFloat(formData.product_price || "0"),
            currency: "PKR",
            content_ids: [formData.variantId],
            content_type: "product",
          });
          fbq("track", "Purchase", {
            value: parseFloat(formData.product_price || "0"),
            currency: "PKR",
            content_ids: [formData.variantId],
            content_type: "product",
          });
          console.log("Meta Pixel Purchase event fired!");
        } else {
          console.log(
            "fbq not defined yet, retrying Meta Pixel track in 200ms...",
          );
          // Retry faster, as it's critical for conversion tracking
          setTimeout(trackMetaPixelPurchaseWithRetry, 200);
        }
      }
      trackMetaPixelPurchaseWithRetry(); // Initiate the tracking process
      // --- META PIXEL TRACKING INTEGRATION END ---
      // Google Analytics tracking
      if (typeof gtag === "function") {
        gtag("event", "purchase", {
          transaction_id: result.orderId,
          value: parseFloat(formData.product_price || "0"),
          currency: "PKR",
        });
      }

      // Google Analytics tracking
      if (typeof gtag === "function") {
        gtag("event", "purchase", {
          transaction_id: result.orderId,
          value: parseFloat(formData.product_price || "0"),
          currency: "PKR",
        });
      }

      popup.classList.remove("active");
      form.reset();
    } catch (err) {
      console.error("FULL ERROR:", err);

      let userMessage = "Network error. Please check your connection.";
      if (err.message.includes("Failed to fetch")) {
        userMessage = "Unable to reach server. Please try again.";
      } else if (err.message.includes("Empty response")) {
        userMessage = "Server returned no data. Please try again.";
      } else if (err.message.includes("invalid data")) {
        userMessage = "Server error. Please try again later.";
      } else if (err.message) {
        userMessage = err.message;
      }

      showMessage("error", userMessage);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    }
  });

  // Phone input formatting – only digits
  const phoneInput = form.querySelector('input[name="phone"]');
  if (phoneInput) {
    phoneInput.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "");
    });
  }
});
