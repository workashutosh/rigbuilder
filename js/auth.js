(function () {
  var GET_PROFILE =
    "https://pqpzjgycchatzncfdjmj.functions.supabase.co/get-profile";

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

  function formatMoney(amount) {
    if (amount == null) return "—";
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(amount);
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

      var user = data.user || {};
      var userSection = document.getElementById("profile-user");
      if (userSection) {
        userSection.innerHTML =
          '<div class="rounded-sm border border-outline-variant/20 bg-surface-container p-8 space-y-4">' +
          '<h2 class="font-headline text-xl font-bold uppercase tracking-tight text-white">Account</h2>' +
          '<dl class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">' +
          profileRow("Name", user.full_name || "—") +
          profileRow("Email", user.email || "—") +
          profileRow("Subscription", user.subscription_status || "—") +
          profileRow("Trial ends", formatDate(user.trial_ends_at)) +
          profileRow("Member since", formatDate(user.created_at)) +
          "</dl></div>";
      }

      var purchases = data.purchases || [];
      var purchasesEl = document.getElementById("profile-purchases");
      if (purchasesEl) {
        var total =
          data.total_purchases != null
            ? data.total_purchases
            : purchases.length;
        var cards = purchases
          .map(function (p) {
            var prod = p.products || {};
            var desc = prod.description
              ? '<p class="text-sm text-on-surface-variant mt-3 line-clamp-3">' +
                escapeHtml(prod.description) +
                "</p>"
              : "";
            return (
              '<div class="border border-outline-variant/20 bg-surface-container-highest p-6 rounded-sm">' +
              '<div class="flex flex-col md:flex-row md:justify-between md:items-start gap-2">' +
              "<div>" +
              '<p class="font-headline font-bold text-white">' +
              escapeHtml(prod.name || "Purchase") +
              "</p>" +
              '<p class="text-xs text-on-surface-variant mt-1">' +
              formatDate(p.created_at) +
              "</p></div>" +
              '<div class="text-left md:text-right">' +
              '<p class="font-headline font-bold text-primary">' +
              formatMoney(p.amount) +
              "</p>" +
              (prod.price != null
                ? '<p class="text-xs text-on-surface-variant">Item ' +
                  formatMoney(prod.price) +
                  "</p>"
                : "") +
              "</div></div>" +
              desc +
              "</div>"
            );
          })
          .join("");

        purchasesEl.innerHTML =
          '<h2 class="font-headline text-xl font-bold uppercase tracking-tight text-white mb-4">Purchases (' +
          total +
          ")</h2>" +
          '<div class="space-y-4">' +
          (cards ||
            '<p class="text-on-surface-variant text-sm">No purchases yet.</p>') +
          "</div>";
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
      loadProfilePage();
    }
  });
})();
