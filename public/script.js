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

function abrir(tipo) {
  modo = tipo;
  document.getElementById("menu").style.display = "none";
  document.getElementById("tela").style.display = "block";
  atualizar();
}

function fechar() {
  document.getElementById("modal").classList.add("hidden");
}

function abrirModalDeposito(box) {
  boxModal = box;
  modoModal = "depositar";
  document.getElementById("modal").classList.remove("hidden");

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
function irHome() {
  document.getElementById("menu").style.display = "block";
  document.getElementById("tela").style.display = "none";
  fechar();
}

function voltar() {
  if (document.getElementById("modal") && !document.getElementById("modal").classList.contains("hidden")) {
    fechar();
    return;
  }

  document.getElementById("menu").style.display = "block";
  document.getElementById("tela").style.display = "none";
}



function atualizar() {
  carregar().then(() => {

    const lista = document.getElementById("lista");
    const titulo = document.getElementById("titulo");

    lista.innerHTML = "";

    

    if (modo === "depositar") {
      titulo.innerText = "Escolha armário livre";

      for (let box of ordem) {
        const info = status[box];

        if (!info) {
          console.error("Erro status:", box, status);
          continue;
        }

        const btn = document.createElement("button");

        if (info.status === "livre") {
          btn.innerText =  box;
          btn.className = "depositar";
          btn.onclick = () => abrirModalDeposito(box);
        } else {
          btn.innerText =  box;
          btn.disabled = true;
        }

        lista.appendChild(btn);
      }
    }
    
    if (modo === "retirar") {
      titulo.innerText = "Escolha armário ocupado";

      let encontrouOcupado = false;

      for (let box of ordem) {
        const info = status[box];

        if (!info) {
          console.error("Erro status:", box, status);
          continue;
        }

        const btn = document.createElement("button");

        if (info.status === "ocupado") {
          encontrouOcupado = true;

          btn.innerText = `${box} (${info.nome})`;
          btn.className = "retirar";
          btn.onclick = () => abrirModalRetirada(box);
        } else {
          btn.innerText = box;
          btn.disabled = true;
        }

        lista.appendChild(btn);
      }

      // 👇 AQUI ESTÁ O NOVO COMPORTAMENTO
      if (!encontrouOcupado) {
        const msg = document.createElement("p");
        msg.innerText = "Nenhum armário ocupado";
        msg.style.marginTop = "20px";
        msg.style.fontWeight = "bold";

        lista.appendChild(msg);
      }
    }
  });
}