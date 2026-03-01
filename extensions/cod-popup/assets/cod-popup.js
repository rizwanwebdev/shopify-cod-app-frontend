document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector("#cod-btn");
  const btnBottom = document.querySelector(".cod-btn-bottom");
  const popup = document.querySelector("#cod-popup");
  const closeBtn = document.querySelector("#closeCodForm");
  const form = document.querySelector("#codOrderForm");
  const submitBtn = form?.querySelector('button[type="submit"]');
  const overlay = document.getElementById("cod-popup-container");

  document.body.appendChild(overlay);
  document.body.appendChild(btnBottom);
  console.log(
    "%c For any web development or shopify related project hire me at contact@rizwanweb.site or check out my portfolio https://rizwanweb.site",
    "font-weight: bold; font-size: 14px;color: rgb(2,135,206); text-shadow: 3px 3px 0 rgb(2,135,206)  15px 15px 0 rgb(2,135,206) , 18px 18px 0 rgb(4,77,145) , 21px 21px 0 rgb(42,21,113)",
  );

  if (!btn || !popup || !form) {
    // console.error("Required COD elements not found");
    return;
  }

  function handleButtonPosition() {
    const windowWidth = window.innerWidth;

    if (windowWidth >= 768) {
      btnBottom.classList.remove("fixed-bottom");
      return;
    }

    const rect = btn.getBoundingClientRect();

    // If original button is above viewport
    if (rect.bottom < 60) {
      btnBottom.classList.add("fixed-bottom");
    } else {
      btnBottom.classList.remove("fixed-bottom");
    }
  }

  window.addEventListener("scroll", handleButtonPosition);
  window.addEventListener("resize", handleButtonPosition);

  const originalBtnText = submitBtn?.textContent || "Place Order";

  const messagePopup = document.querySelector("#message-popup");
  const messageText = document.querySelector("#message-text");
  const messageClose = document.querySelector("#message-close");
  document.body.appendChild(messagePopup);

  function showMessage(type, text, duration = 8000) {
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

  // --- Meta Pixel Event Helper Functions ---

  // Function to track InitiateCheckout with retry logic
  function trackMetaPixelInitiateCheckoutWithRetry() {
    if (typeof fbq === "function") {
      // console.log("fbq defined for InitiateCheckout. Event sent.");
      // You can add parameters like value, currency, content_ids, etc., if they are known when the popup opens
      fbq("track", "InitiateCheckout");
    } else {
      // console.log("fbq not defined yet, retrying InitiateCheckout in 200ms...");
      setTimeout(trackMetaPixelInitiateCheckoutWithRetry, 200);
    }
  }

  // Function to track Purchase with retry logic
  function trackMetaPixelPurchaseWithRetry(formData, resultOrderId) {
    if (typeof fbq === "function") {
      // console.log("fbq defined for Purchase. Event sent.");
      const eventData = {
        value: parseFloat(formData.product_price || "0"),
        currency: "PKR",
        content_ids: [formData.variantId], // Assuming formData.variantId is available
        content_type: "product",
      };
      // fbq("track", "Purchase", eventData);
      // // console.log("Meta Pixel Purchase event fired with data:", eventData);
      // // Google Analytics tracking - moved here for consistency with fbq check
      // if (typeof gtag === "function") {
      //   gtag("event", "purchase", {
      //     transaction_id: resultOrderId,
      //     value: eventData.value,
      //     currency: eventData.currency,
      //   });
      //   // console.log("Google Analytics Purchase event fired.");
      // }
    } else {
      // console.log("fbq not defined yet, retrying Purchase track in 200ms...");
      setTimeout(
        () => trackMetaPixelPurchaseWithRetry(formData, resultOrderId),
        200,
      );
    }
  }
  // --- End Meta Pixel Event Helper Functions ---

  // Show popup - this is where we trigger the Initiate Checkout event
  function openPopup() {
    popup.classList.add("active");
    form.querySelector('input[name="name"]')?.focus();
    trackMetaPixelInitiateCheckoutWithRetry();
  }

  if (btn) {
    btn.addEventListener("click", openPopup);
  }

  if (btnBottom) {
    btnBottom.addEventListener("click", openPopup);
  }

  // Close popup (via closeBtn or outside click)
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      popup.classList.remove("active");
      form.reset();
    });
  }

  popup.addEventListener("click", (e) => {
    if (e.target === popup) {
      popup.classList.remove("active");
      form.reset(); // Also reset form if closed this way
    }
  });

  // Close popup on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && popup.classList.contains("active")) {
      popup.classList.remove("active");
      form.reset(); // Also reset form if closed this way
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
        result = await res.json();
      } catch (parseError) {
        const text = await res.text().catch(() => "");
        // console.log("Raw response text:", text);
        // console.error("Failed to parse JSON from server:", parseError);
        throw new Error(`Server returned invalid data. Status: ${res.status}`);
      }

      // Handle success/error based on JSON + HTTP status
      if (!res.ok || !result.success) {
        let errorMsg =
          result?.message || result?.error || "Order failed. Please try again.";
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

      // Trigger Purchase event after successful order
      trackMetaPixelPurchaseWithRetry(formData, result.orderId);

      popup.classList.remove("active");
      form.reset();
    } catch (err) {
      // console.error("FULL ERROR:", err);

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
