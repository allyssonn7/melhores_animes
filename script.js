let cardContainer = document.querySelector(".card-container");
let campoBusca = document.querySelector("header input");
let botaoBusca = document.querySelector("#botao-busca");
let botaoLimpar = document.querySelector("#botao-limpar");
let filtroGenero = document.querySelector("#filtro-genero");
let filtroAno = document.querySelector("#filtro-ano");
let filtroOrdem = document.querySelector("#filtro-ordem");
let animes = []; // Renomeado para maior clareza
let overlay = document.querySelector("#overlay");

// Adiciona um listener para o clique no botão de busca
botaoBusca.addEventListener('click', iniciarBusca);

// Adiciona um listener para a tecla "Enter" no campo de busca
campoBusca.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        iniciarBusca();
    }
});

// Adiciona listeners para os filtros mudarem
filtroGenero.addEventListener('change', iniciarBusca);
filtroAno.addEventListener('change', iniciarBusca);
filtroOrdem.addEventListener('change', iniciarBusca);

// Adiciona listener para o botão de limpar
botaoLimpar.addEventListener('click', () => {
    campoBusca.value = '';
    filtroGenero.value = '';
    filtroAno.value = '';
    filtroOrdem.value = 'posicao';
    // Remove os parâmetros da URL e inicia a busca para resetar a visualização
    history.pushState(null, '', window.location.pathname);
    localStorage.removeItem('filtrosSalvos'); // Limpa os filtros salvos
    iniciarBusca();
});

// Inicia a aplicação carregando os dados
carregarDadosIniciais();

async function carregarDadosIniciais() {
    try {
        let resposta = await fetch("data.json");
        let dadosJson = await resposta.json();
        animes = dadosJson.top_rated_anime;
        popularFiltros();
        lerParametrosUrlEBuscar(); // Lê a URL e aplica filtros ou renderiza tudo
    } catch (error) {
        console.error("Falha ao buscar dados iniciais:", error);
        cardContainer.innerHTML = `<p class="error-message">Falha ao carregar os animes. Tente recarregar a página.</p>`;
    }
}

function popularFiltros() {
    // Popula filtro de Gênero
    const todosGeneros = animes.flatMap(anime => anime.genero);
    const generosUnicos = [...new Set(todosGeneros)].sort();
    generosUnicos.forEach(genero => {
        const option = document.createElement('option');
        option.value = genero;
        option.textContent = genero;
        filtroGenero.appendChild(option);
    });

    // Popula filtro de Ano
    const todosAnos = animes.map(anime => anime.ano);
    const anosUnicos = [...new Set(todosAnos)].sort((a, b) => b - a); // Mais recentes primeiro
    anosUnicos.forEach(ano => {
        const option = document.createElement('option');
        option.value = ano;
        option.textContent = ano;
        filtroAno.appendChild(option);
    });
}

function lerParametrosUrlEBuscar() {
    const params = new URLSearchParams(window.location.search);
    const temParametrosUrl = params.toString().length > 0;

    if (temParametrosUrl) {
        // Se a URL tem parâmetros, eles têm prioridade
        campoBusca.value = params.get('q') || '';
        filtroGenero.value = params.get('genero') || '';
        filtroAno.value = params.get('ano') || '';
        filtroOrdem.value = params.get('ordem') || 'posicao';
    } else {
        // Se não há parâmetros na URL, tenta carregar do Local Storage
        const filtrosSalvos = JSON.parse(localStorage.getItem('filtrosSalvos'));
        if (filtrosSalvos) {
            campoBusca.value = filtrosSalvos.q || '';
            filtroGenero.value = filtrosSalvos.genero || '';
            filtroAno.value = filtrosSalvos.ano || '';
            filtroOrdem.value = filtrosSalvos.ordem || 'posicao';
        }
    }

    // Inicia a busca com os filtros aplicados
    iniciarBusca();
}

async function iniciarBusca() {
    let dadosFiltrados = [...animes];
    const params = new URLSearchParams();

    // 1. Filtra por texto
    const termoBusca = campoBusca.value.toLowerCase();
    if (termoBusca) {
        dadosFiltrados = dadosFiltrados.filter(anime => 
            anime.titulo.toLowerCase().includes(termoBusca)
        );
        params.append('q', campoBusca.value);
    }

    // 2. Filtra por gênero
    const generoSelecionado = filtroGenero.value;
    if (generoSelecionado) {
        dadosFiltrados = dadosFiltrados.filter(anime => anime.genero.includes(generoSelecionado));
        params.append('genero', generoSelecionado);
    }

    // 3. Filtra por ano
    const anoSelecionado = filtroAno.value;
    if (anoSelecionado) {
        dadosFiltrados = dadosFiltrados.filter(anime => anime.ano == anoSelecionado);
        params.append('ano', anoSelecionado);
    }

    // 4. Aplica a ordenação
    const ordemSelecionada = filtroOrdem.value;
    if (ordemSelecionada === 'titulo') dadosFiltrados.sort((a, b) => a.titulo.localeCompare(b.titulo));
    else if (ordemSelecionada === 'ano') dadosFiltrados.sort((a, b) => b.ano - a.ano);
    else dadosFiltrados.sort((a, b) => a.posicao - b.posicao); // Padrão é por posição/ranking
    
    if (ordemSelecionada !== 'posicao') {
        params.append('ordem', ordemSelecionada);
    }

    // Atualiza a URL com os parâmetros da busca
    // Usamos replaceState para não poluir o histórico do navegador com cada filtro
    const queryString = params.toString();
    const novaUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
    history.replaceState(null, '', novaUrl);

    // Salva os filtros atuais no Local Storage
    const filtrosParaSalvar = {
        q: campoBusca.value,
        genero: generoSelecionado,
        ano: anoSelecionado,
        ordem: ordemSelecionada
    };
    localStorage.setItem('filtrosSalvos', JSON.stringify(filtrosParaSalvar));

    renderizarCards(dadosFiltrados);
}

function renderizarCards(dadosParaRenderizar) {
    cardContainer.innerHTML = ""; // Limpa os cards existentes antes de renderizar novos

    if (dadosParaRenderizar.length === 0) {
        cardContainer.innerHTML = `<p class="nenhum-resultado">Nenhum anime encontrado com os filtros aplicados.</p>`;
        return;
    }

    for (let anime of dadosParaRenderizar) {
        // Prepara o título para a URL de busca (remove texto em parênteses para uma busca mais limpa)
        const tituloBusca = anime.titulo.split('(')[0].trim();
        const urlBuscaStreaming = `https://www.justwatch.com/br/busca?q=${encodeURIComponent(tituloBusca)}`;


        let article = document.createElement("article");
        article.setAttribute('role', 'button');
        article.setAttribute('tabindex', '0');
        article.setAttribute('aria-expanded', 'false');
        article.setAttribute('aria-label', `Ver detalhes de ${anime.titulo}`);
        article.classList.add("card");
        article.innerHTML = `
            <button class="close-button" title="Fechar" aria-label="Fechar detalhes">&times;</button>
            <img class="card-image" src="${anime.imagem_url}" alt="Pôster do anime ${anime.titulo}">
            <h3>${anime.posicao}. ${anime.titulo}</h3>
            <p><strong>Nota:</strong> ${anime.nota} | <strong>Ano:</strong> ${anime.ano}</p>
            <p><strong>Gênero:</strong> ${anime.genero.join(', ')}</p>
            <p class="sinopse"><strong>Sinopse:</strong> ${anime.sinopse}</p>
            <div class="card-footer">
                <p><small><strong>Estúdio/Criador:</strong> ${anime.criador_original}</small></p>
                <a href="${urlBuscaStreaming}" class="streaming-link" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Onde Assistir?</a>
            </div>
        `;
        cardContainer.appendChild(article);
    }
}

function fecharCardExpandido() {
    const expandedCard = document.querySelector('.card.expanded');
    if (expandedCard) {
        expandedCard.classList.remove('expanded');
        expandedCard.setAttribute('aria-expanded', 'false');
        expandedCard.focus(); // Devolve o foco para o card que foi fechado
        overlay.classList.remove('show');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('no-scroll');
    }
}


// Event listener para carregar o vídeo ao clicar no facade (delegação de evento)
cardContainer.addEventListener('click', function(event) {
    const target = event.target;
    const card = target.closest('.card');

    if (!card) return;

    // Lógica para fechar o card
    if (target.classList.contains('close-button') || target.id === 'overlay') {
        fecharCardExpandido();
    }

    // Lógica para expandir o card (se não estiver expandido e o clique não for em um link ou botão interno)
    if (!card.classList.contains('expanded') && !target.closest('a, button')) {
        card.classList.add('expanded');
        card.setAttribute('aria-expanded', 'true');
        overlay.classList.add('show');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('no-scroll');
        // Move o foco para o botão de fechar para facilitar a saída
        card.querySelector('.close-button').focus();
    }
});

// Adiciona listener para navegação por teclado nos cards
cardContainer.addEventListener('keydown', function(event) {
    const card = event.target.closest('.card');
    if (!card) return;

    // Expande o card com Enter ou Espaço, se não estiver expandido
    if ((event.key === 'Enter' || event.key === ' ') && !card.classList.contains('expanded')) {
        event.preventDefault(); // Previne o scroll da página ao usar a barra de espaço
        card.click(); // Simula o clique para reutilizar a lógica de expansão
    }
});

// Listener global para fechar com a tecla Escape
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        fecharCardExpandido();
    }
});

// Adiciona listener ao overlay para fechar o card
overlay.addEventListener('click', fecharCardExpandido);
overlay.setAttribute('aria-hidden', 'true');