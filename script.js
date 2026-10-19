
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

const nomeAluno = document.getElementById("nomeAluno");
const filtro = document.getElementById("filtro");

const ligarCamera = document.getElementById("ligarCamera");
const capturar = document.getElementById("capturar");
const desligarCamera = document.getElementById("desligarCamera");

const statusCamera = document.getElementById("status");
const mensagem = document.getElementById("mensagem");
const avisoCamera = document.getElementById("avisoCamera");
const avisoResultado = document.getElementById("avisoResultado");
const baixarFoto = document.getElementById("baixarFoto");

// Guarda o stream e controla a inicialização da câmera.
let stream = null;
let iniciandoCamera = false;

// Atualiza o indicador visual da câmera.
function atualizarStatus(ligada) {
    if (ligada) {
        statusCamera.textContent = "● Câmera ligada";
        statusCamera.className = "status ligada";
    } else {
        statusCamera.textContent = "● Câmera desligada";
        statusCamera.className = "status desligada";
    }
}

// Liga a câmera e solicita autorização ao navegador.
async function iniciarCamera() {
    if (stream || iniciandoCamera) {
        return;
    }

    // Verifica se o navegador permite acessar a câmera.
    if (!navigator.mediaDevices?.getUserMedia) {
        mensagem.textContent =
            "A câmera não está disponível neste endereço. " +
            "Abra o projeto pelo Live Server ou use HTTPS.";
        return;
    }

    iniciandoCamera = true;
    ligarCamera.disabled = true;
    mensagem.textContent = "Solicitando acesso à câmera...";

    let novoStream = null;

    try {
        // Solicita acesso à câmera, sem ativar o microfone.
        novoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user"
            },
            audio: false
        });

        stream = novoStream;

        // Conecta a câmera ao elemento de vídeo.
        video.srcObject = stream;

        // Aguarda o vídeo carregar antes de habilitar a captura.
        await new Promise((resolve, reject) => {
            if (video.readyState >= 2 && video.videoWidth > 0) {
                resolve();
                return;
            }

            const aoCarregar = () => {
                limparEventos();
                resolve();
            };

            const aoFalhar = () => {
                limparEventos();
                reject(new Error("Não foi possível carregar o vídeo."));
            };

            const limparEventos = () => {
                video.removeEventListener("loadeddata", aoCarregar);
                video.removeEventListener("error", aoFalhar);
            };

            video.addEventListener("loadeddata", aoCarregar, {
                once: true
            });

            video.addEventListener("error", aoFalhar, {
                once: true
            });
        });

        // Solicita ao navegador que reproduza o vídeo.
        await video.play();

        // Exibe a câmera e esconde a mensagem inicial.
        video.hidden = false;
        avisoCamera.hidden = true;

        atualizarStatus(true);

        capturar.disabled = false;
        desligarCamera.disabled = false;

        mensagem.textContent =
            "Câmera pronta! Digite seu nome e capture uma foto.";

    } catch (erro) {
        // Encerra as faixas se a câmera não iniciar corretamente.
        if (novoStream) {
            novoStream.getTracks().forEach(track => track.stop());
        }

        stream = null;
        video.srcObject = null;
        video.hidden = true;
        avisoCamera.hidden = false;

        atualizarStatus(false);

        capturar.disabled = true;
        desligarCamera.disabled = true;

        // Apresenta uma mensagem de acordo com o erro.
        if (
            erro.name === "NotAllowedError" ||
            erro.name === "PermissionDeniedError"
        ) {
            mensagem.textContent =
                "Permissão negada. Autorize a câmera nas configurações do navegador.";
        } else if (erro.name === "NotFoundError") {
            mensagem.textContent =
                "Nenhuma câmera foi encontrada neste dispositivo.";
        } else if (erro.name === "NotReadableError") {
            mensagem.textContent =
                "A câmera está sendo utilizada por outro programa. Feche-o e tente novamente.";
        } else {
            mensagem.textContent =
                "Não foi possível iniciar a câmera. Verifique as permissões e tente novamente.";
        }

        console.error("Erro ao iniciar a câmera:", erro);

    } finally {
        iniciandoCamera = false;
        ligarCamera.disabled = false;
    }
}

// Captura a imagem e aplica o efeito selecionado.
function capturarFoto() {
    if (
        !stream ||
        video.readyState < 2 ||
        video.videoWidth === 0
    ) {
        mensagem.textContent =
            "Ligue a câmera e aguarde o vídeo aparecer antes de capturar.";
        return;
    }

    const nome = nomeAluno.value.trim();

    if (!nome) {
        mensagem.textContent =
            "Digite o nome do aluno antes de tirar a foto.";

        nomeAluno.focus();
        return;
    }

    // Define o tamanho real da fotografia.
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Aplica o filtro escolhido ao desenho da imagem.
    context.filter = filtro.value;

    context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );

    // Retira o filtro para manter os textos legíveis.
    context.filter = "none";

    // Registra a data e a hora da captura.
    const agora = new Date();
    const dataHora = agora.toLocaleString("pt-BR");

    // Calcula as dimensões dos textos conforme a imagem.
    const margem = canvas.width * 0.035;
    const tamanhoFonte = Math.max(16, canvas.width * 0.025);
    const tamanhoData = Math.max(12, tamanhoFonte * 0.75);
    const alturaFaixa = tamanhoFonte * 2.7 + margem;

    // Desenha uma faixa escura na parte inferior da foto.
    context.fillStyle = "rgba(0, 0, 0, 0.75)";

    context.fillRect(
        0,
        canvas.height - alturaFaixa,
        canvas.width,
        alturaFaixa
    );

    // Configura o texto de identificação.
    context.fillStyle = "#ffffff";
    context.textBaseline = "top";
    context.font = `bold ${tamanhoFonte}px Arial`;

    // Escreve o nome do aluno na fotografia.
    context.fillText(
        `Aluno: ${nome}`,
        margem,
        canvas.height - alturaFaixa + margem * 0.3,
        canvas.width - margem * 2
    );

    // Escreve a data e a hora na fotografia.
    context.font = `${tamanhoData}px Arial`;

    context.fillText(
        `Captura: ${dataHora}`,
        margem,
        canvas.height - tamanhoData - margem * 0.4,
        canvas.width - margem * 2
    );

    // Apresenta a fotografia processada.
    canvas.style.display = "block";
    avisoResultado.hidden = true;

    // Cria o link para baixar a imagem em PNG.
    baixarFoto.href = canvas.toDataURL("image/png");
    baixarFoto.hidden = false;

    mensagem.textContent =
        "Fotografia capturada e processada com sucesso!";
}

// Desliga a câmera e libera os recursos utilizados.
function encerrarCamera() {
    if (stream) {
        // Interrompe todas as faixas do stream.
        stream.getTracks().forEach(track => track.stop());

        stream = null;
    }

    // Desconecta o vídeo da câmera.
    video.pause();
    video.srcObject = null;
    video.hidden = true;

    // Volta a exibir o aviso inicial.
    avisoCamera.hidden = false;

    // Atualiza os botões.
    capturar.disabled = true;
    desligarCamera.disabled = true;
    ligarCamera.disabled = false;

    atualizarStatus(false);

    mensagem.textContent =
        "Câmera desligada. Você pode ligá-la novamente.";
}

// Conecta os botões às funções.
ligarCamera.addEventListener("click", iniciarCamera);
capturar.addEventListener("click", capturarFoto);
desligarCamera.addEventListener("click", encerrarCamera);

// Encerra o acesso à câmera ao sair da página.
window.addEventListener("pagehide", encerrarCamera);

// Define o estado inicial da interface.
video.hidden = true;
avisoCamera.hidden = false;
canvas.style.display = "none";

capturar.disabled = true;
desligarCamera.disabled = true;

atualizarStatus(false);
