(function initContactForm() {
  var form = document.getElementById("contact-form");
  var statusEl = document.getElementById("contact-status");

  if (!form || !statusEl) {
    return;
  }

  var contactConfig = window.VIENNA_CONTACT_CONFIG || {};
  var web3AccessKey = (contactConfig.web3formsAccessKey || "").trim();

  if (!web3AccessKey) {
    statusEl.textContent = "Form hazir degil. Web3Forms access key eksik veya eski cache acik.";
    statusEl.className = "contact-status is-error";
    return;
  }

  form.addEventListener("submit", function handleSubmit(event) {
    event.preventDefault();

    var submitButton = form.querySelector("button[type='submit']");
    var name = (document.getElementById("name").value || "").trim();
    var email = (document.getElementById("email").value || "").trim();
    var phone = (document.getElementById("phone").value || "").trim();
    var message = (document.getElementById("message").value || "").trim();

    if (!name || !email || !message) {
      setStatus("Lutfen zorunlu alanlari doldurun.", true);
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Gonderiliyor...";

    var data = new FormData();
    data.append("access_key", web3AccessKey);
    data.append("subject", "Yeni Iletisim Formu: " + name);
    data.append("from_name", "Vienna Event Web Form");
    data.append("name", name);
    data.append("contact_email", email);
    data.append("replyto", email);
    data.append("phone", phone);
    data.append("message", message);
    data.append("botcheck", "");

    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: {
        Accept: "application/json"
      },
      body: data
    })
      .then(function(response) {
        return response.json();
      })
      .then(function(result) {
        if (!result.success) {
          throw new Error(result.message || "Gonderim basarisiz.");
        }
        form.reset();
        setStatus("Mesajiniz alindi. En kisa surede donus saglayacagiz.", false);
      })
      .catch(function(error) {
        setStatus("Mesaj gonderilemedi: " + error.message, true);
      })
      .finally(function() {
        submitButton.disabled = false;
        submitButton.textContent = "Gonderin";
      });
  });

  function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.className = isError ? "contact-status is-error" : "contact-status is-success";
  }
})();
