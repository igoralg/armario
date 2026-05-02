let modo = null;
let status = {};
let boxModal = null;
let modoModal = null;

const ordem = ["A1","A2","A3"];


function carregar() {
  return fetch("/status")
    .then(r => r.json())
    .then(d => status = d);
}


function fechar() {
  document.getElementById("modal").classList.add("hidden");

  window.scrollTo({
    top: 0,
    behavior: "instant" // ou "smooth"
  });
}

function abrirModalDeposito(box) {
  boxModal = box;
  modoModal = "depositar";
  document.getElementById("modal").classList.remove("hidden");

  boxModal = box;
  modoModal = "depositar";
  document.getElementById("modal").classList.remove("hidden");


  document.getElementById("labelNome").style.display = "block";
  document.getElementById("labelTelefone").style.display = "block";
  document.getElementById("labelCodigo").style.display = "none";


  document.getElementById("nome").style.display = "block";
  document.getElementById("telefone").style.display = "block";
  document.getElementById("codigo").style.display = "none";

  document.getElementById("modalTitulo").innerText = "Depositar";
}

function abrirModalRetirada(box) {
  boxModal = box;
  modoModal = "retirar";
  document.getElementById("modal").classList.remove("hidden");

  document.getElementById("nome").style.display = "none";
  document.getElementById("telefone").style.display = "none";
  document.getElementById("codigo").style.display = "block";

  document.getElementById("labelNome").style.display = "none";
  document.getElementById("labelTelefone").style.display = "none";
  document.getElementById("labelCodigo").style.display = "block";

  document.getElementById("modalTitulo").innerText = "Retirar";
}

function confirmar() {


  if (modoModal === "depositar") {

    const nomeInput = document.getElementById("nome");
    const telefoneInput = document.getElementById("telefone");

    if (!nomeInput.value.trim()) {
      alert("Digite o nome");
      return;
    }

    if (!telefoneInput.value.trim()) {
      alert("Digite o telefone");
      return;
    }

    fetch("/acao", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        tipo:"depositar",
        box: boxModal,
        nome: nomeInput.value,
        telefone: telefoneInput.value
      })
    })
    .then(r => r.json())
    .then(d => {

      if (d.erro) {
        alert(d.erro);
        return;
      }

      fechar();
      atualizar();
    });
  }

  if (modoModal === "retirar") {

  const codigoInput = document.getElementById("codigo");

  if (!codigoInput.value) {
    alert("Digite o código");
    return;
  }

  fetch("/acao", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tipo: "retirar",
      box: boxModal,
      codigo: codigoInput.value
    })
  })
  .then(r => r.json())
  .then(d => {

    if (d.erro) {
      alert(d.erro);
      return;
    }

    fechar();
    atualizar();
  });
}
}




function atualizar() {
  carregar().then(() => {

    const lista = document.getElementById("lista");
    const titulo = document.getElementById("titulo");
    lista.innerHTML = "";

    for (let box of ordem) {

      const info = status[box];

      if (!info) {
        console.warn("Erro status:", box, status);
        continue;
      }

      const btn = document.createElement("button");

      btn.innerText = box;
      btn.classList.add("armario");

      if (info.status === "livre") {
        btn.classList.add("disponivel");

        // 👇 igual lógica de depositar
        btn.onclick = () => abrirModalDeposito(box);

        const statusText = document.createElement("span");
        statusText.innerText = "Disponível";
        statusText.className = "status-text";

        btn.appendChild(statusText);

      } else {
        btn.classList.add("ocupado");

        // 👇 igual lógica de retirar
        btn.onclick = () => abrirModalRetirada(box);

        const statusText = document.createElement("span");
        statusText.innerText = "Ocupado"
        statusText.className = "status-text";

        btn.appendChild(statusText);
      }

      lista.appendChild(btn);
      // 👇 NOME DO CLIENTE
      if (info.nome) {
        const nomeText = document.createElement("span");
        nomeText.innerText = info.nome;
        nomeText.className = "status-text";

        btn.appendChild(nomeText);
      }
    }
  });
}
atualizar();
setInterval(atualizar, 5000);
