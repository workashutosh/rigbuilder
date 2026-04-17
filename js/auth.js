(function () {
  var GET_PROFILE =
    "https://pqpzjgycchatzncfdjmj.functions.supabase.co/get-profile";
  var DISCARD_CHECKOUT =
    "https://pqpzjgycchatzncfdjmj.functions.supabase.co/discard-checkout";
  var DEFAULT_STRIPE_PUBLISHABLE_KEY = "pk_test_REPLACE_WITH_YOUR_KEY";

  function signOut() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
  }

  function bindSignOut(root) {
    var btn = root.querySelector("[data-sign-out]");
    if (btn) btn.addEventListener("click", signOut);
  }

  function renderLoggedInNav(root) {
    var variant = root.getAttribute("data-auth-variant") || "index";
    var html = "";
    if (variant === "garage" || variant === "profile") {
      var active =
        variant === "profile"
          ? "text-primary border-b-2 border-primary pb-1"
          : "text-on-surface-variant hover:text-primary transition-colors";
      html =
        '<div class="flex gap-4 items-center">' +
        '<a href="profile.html" class="' +
        active +
        ' font-[\'Space_Grotesk\'] uppercase text-xs font-bold tracking-wider" aria-current="' +
        (variant === "profile" ? "page" : "false") +
        '">Profile</a>' +
        '<button type="button" data-sign-out class="text-on-surface-variant hover:text-error text-xs font-[\'Space_Grotesk\'] uppercase font-bold tracking-wider">Sign out</button>' +
        "</div>";
    } else {
      html =
        '<a href="profile.html" class="hidden lg:inline-flex items-center justify-center kinetic-gradient text-on-primary-container font-headline font-bold uppercase tracking-widest text-xs py-3 px-6 rounded-sm active:scale-95 duration-150 transition-all">My profile</a>' +
        '<div class="flex gap-4 text-gray-400 items-center">' +
        '<a href="profile.html" class="lg:hidden text-gray-400 hover:text-white transition-all" aria-label="My profile"><span class="material-symbols-outlined">account_circle</span></a>' +
        '<button type="button" data-sign-out class="text-gray-400 hover:text-white transition-all text-xs font-headline uppercase tracking-wider px-2">Sign out</button>' +
        "</div>";
    }
    root.innerHTML = html;
    bindSignOut(root);
  }

  function formatDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch (e) {
      return iso;
    }
  }

  function showProfileToast(message) {
    var toast = document.getElementById("profile-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("opacity-0", "translate-y-2", "pointer-events-none");
    toast.classList.add("opacity-100", "translate-y-0");
    clearTimeout(showProfileToast._t);
    showProfileToast._t = setTimeout(function () {
      toast.classList.add("opacity-0", "translate-y-2", "pointer-events-none");
      toast.classList.remove("opacity-100", "translate-y-0");
    }, 4000);
  }

  function hidePaymentSuccessModal() {
    var modal = document.getElementById("payment-success-modal");
    var panel = document.getElementById("payment-success-modal-panel");
    if (!modal) return;
    modal.setAttribute("aria-hidden", "true");
    modal.classList.add("opacity-0", "pointer-events-none");
    modal.classList.remove("opacity-100");
    if (panel) {
      panel.classList.add("scale-95");
      panel.classList.remove("scale-100");
    }
    document.body.classList.remove("overflow-hidden");
    if (hidePaymentSuccessModal._onKey) {
      document.removeEventListener("keydown", hidePaymentSuccessModal._onKey);
      hidePaymentSuccessModal._onKey = null;
    }
  }

  function showPaymentSuccessModal() {
    var modal = document.getElementById("payment-success-modal");
    var panel = document.getElementById("payment-success-modal-panel");
    if (!modal) {
      showProfileToast(
        "Payment completed (demo). No charge was processed and no funds were taken."
      );
      return;
    }
    modal.setAttribute("aria-hidden", "false");
    modal.classList.remove("opacity-0", "pointer-events-none");
    modal.classList.add("opacity-100");
    if (panel) {
      panel.classList.remove("scale-95");
      panel.classList.add("scale-100");
    }
    document.body.classList.add("overflow-hidden");
    hidePaymentSuccessModal._onKey = function (ev) {
      if (ev.key === "Escape") hidePaymentSuccessModal();
    };
    document.addEventListener("keydown", hidePaymentSuccessModal._onKey);
    requestAnimationFrame(function () {
      var btn = document.getElementById("payment-success-dismiss");
      if (btn && typeof btn.focus === "function") btn.focus();
    });
  }

  function bindPaymentSuccessModal() {
    var modal = document.getElementById("payment-success-modal");
    if (!modal || modal.dataset.bound === "1") return;
    modal.dataset.bound = "1";
    modal.addEventListener("click", function (e) {
      if (
        e.target.closest("[data-payment-modal-backdrop]") ||
        e.target.closest("[data-close-payment-modal]")
      ) {
        hidePaymentSuccessModal();
      }
    });
  }

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function profileRow(label, value) {
    return (
      "<div><dt class=\"text-[10px] uppercase tracking-widest text-on-surface-variant\">" +
      escapeHtml(label) +
      '</dt><dd class="text-on-surface mt-1">' +
      escapeHtml(String(value)) +
      "</dd></div>"
    );
  }

  function buildUserCardHtml(user) {
    return (
      '<div class="rounded-sm border border-outline-variant/20 bg-surface-container p-6 space-y-4">' +
      '<h2 class="font-headline text-sm font-bold uppercase tracking-tight text-primary">Account</h2>' +
      '<dl class="grid grid-cols-1 gap-4 text-sm">' +
      profileRow("Name", user.full_name || "—") +
      profileRow("Email", user.email || "—") +
      profileRow("Subscription", user.subscription_status || "—") +
      profileRow("Trial ends", formatDate(user.trial_ends_at)) +
      profileRow("Member since", formatDate(user.created_at)) +
      "</dl></div>"
    );
  }

  function productFromLine(line) {
    if (!line || typeof line !== "object") return {};
    var nested = line.products || line.product;
    if (nested && typeof nested === "object") return nested;
    return {};
  }

  /** Flat purchase rows use product_name on the line; nested products use .name */
  function lineProductTitle(line, prod) {
    return (
      line.product_name ||
      prod.name ||
      line.name ||
      "Line item"
    );
  }

  function lineProductMetaHtml(line) {
    var parts = [];
    if (line.category_id)
      parts.push(
        '<div class="text-primary uppercase tracking-wider text-[10px] font-label">' +
          escapeHtml(String(line.category_id)) +
          "</div>"
      );
    if (line.variant_key)
      parts.push(
        '<div class="text-on-surface-variant text-xs font-mono break-all">' +
          escapeHtml(String(line.variant_key)) +
          "</div>"
      );
    if (line.stripe_session_id)
      parts.push(
        '<div class="text-on-surface-variant/80 text-[10px] uppercase tracking-wider font-label">Ref ' +
          escapeHtml(String(line.stripe_session_id)) +
          "</div>"
      );
    var nested = productFromLine(line);
    var desc = nested.description || line.description;
    if (desc) {
      var short = desc.length > 160 ? desc.slice(0, 157) + "…" : desc;
      parts.push(
        '<span class="block text-xs text-on-surface-variant mt-2 leading-relaxed whitespace-pre-wrap">' +
          escapeHtml(short) +
          "</span>"
      );
    }
    if (!parts.length) return "";
    return '<div class="mt-2 space-y-1">' + parts.join("") + "</div>";
  }

  /** Server often returns the active bucket as `purchases`; dedicated checkout keys may be empty. */
  function resolveCheckoutItems(data) {
    var raw =
      data.checkout_items ||
      data.checkout ||
      data.cart_items ||
      data.pending_checkout ||
      [];
    if (!Array.isArray(raw)) raw = [];
    var purchases = Array.isArray(data.purchases) ? data.purchases : [];
    if (raw.length) return raw;
    return purchases;
  }

  function lineQuantity(line) {
    var q = line.quantity != null ? line.quantity : line.qty;
    if (q == null || q === "") return 1;
    var n = Number(q);
    return isFinite(n) && n >= 0 ? n : 1;
  }

  /** Plain number for display — grouping only, no currency symbol or code. */
  function formatPlainAmount(n) {
    if (n == null || n === "") return "—";
    var num = Number(n);
    if (!isFinite(num)) return "—";
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 2,
      useGrouping: true,
    }).format(num);
  }

  function lineLineTotal(line) {
    if (line.total_amount != null) return Number(line.total_amount);
    if (line.amount != null) return Number(line.amount);
    return NaN;
  }

  function lineUnitAmount(line) {
    if (line.unit_price != null) return Number(line.unit_price);
    var total = lineLineTotal(line);
    var q = lineQuantity(line);
    if (isFinite(total) && q > 0) return total / q;
    return NaN;
  }

  function resolveCheckoutSessionId(checkoutItems) {
    if (!Array.isArray(checkoutItems)) return "";
    for (var i = 0; i < checkoutItems.length; i += 1) {
      var line = checkoutItems[i] || {};
      var sessionId =
        line.stripe_session_id ||
        line.checkout_session_id ||
        line.session_id ||
        "";
      if (sessionId) return String(sessionId);
    }
    return "";
  }

  function createStripeClient() {
    if (typeof window === "undefined" || typeof window.Stripe !== "function") {
      return { error: "Stripe.js did not load. Check your network and try again." };
    }
    var key =
      (window.STRIPE_PUBLISHABLE_KEY || DEFAULT_STRIPE_PUBLISHABLE_KEY || "").trim();
    if (!key || key === DEFAULT_STRIPE_PUBLISHABLE_KEY) {
      return { error: "Add your Stripe publishable key in profile.html first." };
    }
    try {
      return { stripe: window.Stripe(key) };
    } catch (e) {
      return { error: "Invalid Stripe publishable key configuration." };
    }
  }

  async function launchStripeCheckout(sessionId, buttonEl) {
    if (!sessionId) {
      showProfileToast("No Stripe session found for this checkout yet.");
      return;
    }
    var stripeResult = createStripeClient();
    if (stripeResult.error) {
      showProfileToast(stripeResult.error);
      return;
    }
    if (buttonEl) buttonEl.disabled = true;
    try {
      var result = await stripeResult.stripe.redirectToCheckout({
        sessionId: sessionId,
      });
      if (result && result.error && result.error.message) {
        showProfileToast(result.error.message);
      }
    } catch (e) {
      showProfileToast("Could not start Stripe Checkout. Please try again.");
    } finally {
      if (buttonEl) buttonEl.disabled = false;
    }
  }

  function buildCheckoutTableHtml(checkoutItems) {
    var unitSum = 0;
    var amountSum = 0;
    checkoutItems.forEach(function (line) {
      unitSum += lineQuantity(line);
      var lt = lineLineTotal(line);
      if (isFinite(lt)) amountSum += lt;
    });
    var lineCount = checkoutItems.length;

    var empty =
      '<div class="flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-outline-variant/30 rounded-sm bg-surface-container-low/30">' +
      '<span class="material-symbols-outlined text-5xl text-outline-variant mb-3">shopping_cart</span>' +
      '<p class="font-headline font-bold text-on-surface-variant">Bucket is empty</p>' +
      '<p class="text-xs text-on-surface-variant/70 mt-2 font-label uppercase tracking-widest max-w-sm">Nothing in checkout yet.</p>' +
      "</div>";

    if (!lineCount) {
      return { inner: empty, lineCount: 0, unitSum: 0, amountSum: 0 };
    }

    var header =
      '<div class="grid grid-cols-12 gap-3 px-4 py-3 bg-surface-container border-b border-outline-variant/20 text-[10px] font-label uppercase tracking-widest text-on-surface-variant min-w-[960px]">' +
      '<div class="col-span-12 sm:col-span-3">Product / detail</div>' +
      '<div class="col-span-4 sm:col-span-2">SKU</div>' +
      '<div class="col-span-4 sm:col-span-1">Qty</div>' +
      '<div class="col-span-4 sm:col-span-2 text-right sm:text-left">Unit</div>' +
      '<div class="col-span-6 sm:col-span-2 text-right sm:text-left">Line total</div>' +
      '<div class="col-span-6 sm:col-span-2">Recorded</div>' +
      "</div>";

    var rows = checkoutItems
      .map(function (line) {
        var prod = productFromLine(line);
        var title = lineProductTitle(line, prod);
        var sku = String(line.sku || prod.sku || "—");
        var qty = lineQuantity(line);
        var when = formatDate(line.created_at || line.added_at);
        var status = line.status || line.state || "";
        var statusBit = status
          ? '<span class="text-[10px] uppercase tracking-wider text-primary mt-1 block">' +
            escapeHtml(status) +
            "</span>"
          : "";
        var meta = lineProductMetaHtml(line);
        var unitAmt = lineUnitAmount(line);
        var lineTot = lineLineTotal(line);
        return (
          '<div class="grid grid-cols-12 gap-3 px-4 py-4 border-t border-outline-variant/10 items-start hover:bg-surface-container-low/40 transition-colors min-w-[960px]">' +
          '<div class="col-span-12 sm:col-span-3 min-w-0">' +
          '<p class="font-headline font-bold text-white leading-snug">' +
          escapeHtml(title) +
          "</p>" +
          statusBit +
          meta +
          "</div>" +
          '<div class="col-span-4 sm:col-span-2 font-mono text-sm text-on-surface-variant break-all">' +
          escapeHtml(sku) +
          "</div>" +
          '<div class="col-span-4 sm:col-span-1 font-headline font-bold text-lg text-white">' +
          escapeHtml(String(qty)) +
          "</div>" +
          '<div class="col-span-4 sm:col-span-2 font-headline font-bold text-white tabular-nums">' +
          escapeHtml(formatPlainAmount(unitAmt)) +
          "</div>" +
          '<div class="col-span-6 sm:col-span-2 font-headline font-bold text-primary tabular-nums">' +
          escapeHtml(formatPlainAmount(lineTot)) +
          "</div>" +
          '<div class="col-span-6 sm:col-span-2 text-xs text-on-surface-variant">' +
          escapeHtml(when) +
          "</div>" +
          "</div>"
        );
      })
      .join("");

    var totals =
      '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-4 bg-surface-container border-t border-primary-container/30 min-w-[960px]">' +
      '<div class="flex flex-wrap gap-x-10 gap-y-2">' +
      '<div><p class="text-on-surface-variant uppercase tracking-widest text-[10px] font-label mb-0.5">Total lines</p><p class="font-headline font-bold text-2xl text-white">' +
      lineCount +
      "</p></div>" +
      '<div><p class="text-on-surface-variant uppercase tracking-widest text-[10px] font-label mb-0.5">Total units</p><p class="font-headline font-bold text-2xl text-white">' +
      unitSum +
      "</p></div>" +
      '<div><p class="text-on-surface-variant uppercase tracking-widest text-[10px] font-label mb-0.5">Total amount</p><p class="font-headline font-bold text-2xl text-primary tabular-nums">' +
      formatPlainAmount(amountSum) +
      "</p></div>" +
      "</div>" +
      '<p class="text-xs text-on-surface-variant max-w-md leading-relaxed">Amounts are numeric only (no currency symbol). Line total uses total_amount, or amount if needed.</p>' +
      "</div>";

    return {
      inner:
        '<div class="overflow-x-auto rounded-sm border border-outline-variant/20 bg-surface-container-low">' +
        '<div class="inline-block min-w-full align-middle">' +
        header +
        rows +
        totals +
        "</div></div>",
      lineCount: lineCount,
      unitSum: unitSum,
      amountSum: amountSum,
    };
  }

  function bindProfileCheckoutActions() {
    var root = document.getElementById("profile-app");
    if (!root || root.dataset.checkoutBound === "1") return;
    root.dataset.checkoutBound = "1";
    root.addEventListener("click", function (e) {
      var checkoutBtn = e.target.closest("[data-checkout-demo]");
      var completeBtn = e.target.closest("[data-complete-payment-demo]");
      var discardBtn = e.target.closest("[data-discard-checkout]");
      if (checkoutBtn && !checkoutBtn.disabled) {
        e.preventDefault();
        var sessionId = checkoutBtn.getAttribute("data-stripe-session-id") || "";
        launchStripeCheckout(sessionId, checkoutBtn);
        return;
      }
      if (completeBtn && !completeBtn.disabled) {
        e.preventDefault();
        showPaymentSuccessModal();
        return;
      }
      if (discardBtn) {
        e.preventDefault();
        var token = localStorage.getItem("access_token");
        if (!token) {
          signOut();
          return;
        }
        discardBtn.disabled = true;
        fetch(DISCARD_CHECKOUT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: "{}",
        })
          .then(function (r) {
            return r.json().then(function (data) {
              return { ok: r.ok, data: data };
            });
          })
          .then(function (result) {
            discardBtn.disabled = false;
            var d = result.data || {};
            if (result.ok && d.success !== false) {
              var msg =
                (d.message || "Checkout discarded.") +
                (d.deleted_count != null
                  ? " Removed " + d.deleted_count + " row(s)."
                  : "");
              showProfileToast(msg);
              loadProfilePage();
            } else {
              showProfileToast(
                (d && d.message) || "Could not discard checkout. Try again."
              );
            }
          })
          .catch(function () {
            discardBtn.disabled = false;
            showProfileToast("Network error while discarding checkout.");
          });
      }
    });
  }

  async function loadProfilePage() {
    var loading = document.getElementById("profile-loading");
    var errEl = document.getElementById("profile-error");
    var content = document.getElementById("profile-content");
    var token = localStorage.getItem("access_token");

    if (!token) {
      window.location.replace("login.html");
      return;
    }

    try {
      var res = await fetch(GET_PROFILE, {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
        },
      });
      var data = await res.json().catch(function () {
        return {};
      });

      if (!res.ok || data.success === false) {
        signOut();
        return;
      }

      if (loading) loading.classList.add("hidden");
      if (errEl) errEl.classList.add("hidden");
      if (content) content.classList.remove("hidden");

      bindProfileCheckoutActions();

      var user = data.user || {};
      var userCard = buildUserCardHtml(user);
      var sidebarUser = document.getElementById("profile-sidebar-user");
      if (sidebarUser) sidebarUser.innerHTML = userCard;
      var mobileUser = document.getElementById("profile-mobile-user");
      if (mobileUser) mobileUser.innerHTML = userCard;

      var checkoutItems = resolveCheckoutItems(data);

      var table = buildCheckoutTableHtml(checkoutItems);
      var hasLines = table.lineCount > 0;
      var disabledPrimary = hasLines ? "" : " disabled";

      var actionsEl = document.getElementById("profile-checkout-actions");
      if (actionsEl) {
        var stripeSessionId = resolveCheckoutSessionId(checkoutItems);
        var stripeDisabled = stripeSessionId ? "" : " disabled";
        actionsEl.innerHTML =
          '<button type="button" data-checkout-demo' +
          disabledPrimary +
          stripeDisabled +
          ' data-stripe-session-id="' +
          escapeHtml(stripeSessionId) +
          '"' +
          ' class="inline-flex items-center justify-center py-4 px-8 bg-gradient-to-r from-primary to-primary-container text-on-primary-container uppercase font-bold text-xs tracking-widest hover:opacity-90 transition-opacity duration-200 gap-2 rounded-sm disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed">' +
          '<span class="material-symbols-outlined text-sm">shopping_cart_checkout</span> Stripe checkout' +
          "</button>" +
          '<button type="button" data-complete-payment-demo' +
          disabledPrimary +
          ' class="inline-flex items-center justify-center py-4 px-8 bg-surface-container-high text-on-surface uppercase font-bold text-xs tracking-widest hover:bg-primary hover:text-on-primary transition-all duration-300 gap-2 rounded-sm disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed">' +
          '<span class="material-symbols-outlined text-sm">payments</span> Complete payment (demo)' +
          "</button>" +
          '<button type="button" data-discard-checkout class="inline-flex items-center justify-center py-4 px-8 border border-outline-variant/40 text-on-surface-variant uppercase font-bold text-xs tracking-widest hover:border-primary hover:text-primary transition-all duration-300 gap-2 rounded-sm">' +
          '<span class="material-symbols-outlined text-sm">delete_sweep</span> Discard checkout' +
          "</button>" +
          (!stripeSessionId && hasLines
            ? '<p class="w-full text-xs text-on-surface-variant">Stripe session missing for these items. Create a Checkout Session on your backend and include <code class="font-mono">stripe_session_id</code>.</p>'
            : "");
      }

      var checkoutEl = document.getElementById("profile-checkout");
      if (checkoutEl) {
        checkoutEl.innerHTML =
          '<div class="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">' +
          '<div class="flex items-center gap-4">' +
          '<span class="h-[1px] w-12 bg-primary shrink-0"></span>' +
          '<h2 class="font-headline text-xl font-bold uppercase tracking-tight text-white">Checkout bucket</h2>' +
          "</div>" +
          (hasLines
            ? '<p class="text-xs text-on-surface-variant font-label uppercase tracking-widest">' +
              table.lineCount +
              " line(s) · " +
              table.unitSum +
              " unit(s) · " +
              formatPlainAmount(table.amountSum) +
              " total</p>"
            : "") +
          "</div>" +
          table.inner;
      }
    } catch (e) {
      if (loading) loading.classList.add("hidden");
      if (content) content.classList.add("hidden");
      if (errEl) {
        errEl.classList.remove("hidden");
        errEl.textContent =
          "Could not load profile. Check your connection and try again.";
      }
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var root = document.getElementById("auth-nav-root");
    if (root && localStorage.getItem("access_token")) {
      renderLoggedInNav(root);
    }

    if (document.getElementById("profile-app")) {
      bindPaymentSuccessModal();
      loadProfilePage();
    }
  });
})();
