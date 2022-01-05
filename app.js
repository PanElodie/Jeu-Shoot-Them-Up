let svg = d3.select('svg');
let joueur = d3.select('.joueur');
let pause = d3.select('.pause');
let persoBoss = d3.select('.boss');

let vieJoueur = 2;
let score = 0;
let   meilleurScore = window.localStorage.getItem('best');

// Coordonnées du joueur
let joueur_coord = {
    x: 20,
    y: 100
};

let kameks = [];
let tirs_joueur = [];
let tirs_kamek = [];

// Variables qui ne seront initialisées seulement quand un boss apparaitra
let boss = false;
let boss_coord = {};
let tirs_boss = [];
let mouvementBoss;
let creationTirBoss;
let mouvementTirBoss;
let vieBoss;

// Variables qui ne seront initialisées seulement quand un champignon apparaitra
let champi_coord;
let mouvementChampi;

// Variables qui influencent l'action enclenchée la barre d'espace
let jeuEnPause = false;
let jeuPerdu = false;

// Au déplacement de la souris, Mario se déplace
svg.on('mousemove', function (e) {
    var pointer = d3.pointer(e);
    joueur_coord.y = pointer[1];

    joueur.attr('y', joueur_coord.y);

    // Mario ne peut pas se déplacer en dehors de sa zone
    pointer[0] < 75 ? joueur_coord.x = pointer[0] : joueur_coord.x = 75;
    joueur.attr('x', joueur_coord.x);
})

function suppressionDansTableau(tableau, critere) {
    let suppression = false;

    for (let i = tableau.length - 1; i >= 0; i--) {
        if (critere(tableau[i])) {
            tableau.splice(i, 1);
            suppression = true;
        }
    }
    return suppression;
}

function creationSuppression(tableau, element) {

    let lien = svg.selectAll(`.${element}`)
        .data(tableau);
    lien.enter()
        .append('use')
        .attr('class', element)
        .attr('href', `#${element}`);
    lien.exit()
        .remove();

    position(element);
}

// Mise à jour des positions de plusieurs éléments
function position(element) {
    svg.selectAll(`.${element}`)
        .attr("transform", d => `translate(${d.x},${d.y})`);
}

// Mise à jour de la position d'un élément
function updateCoords(objet, classe){
    svg.select(`.${classe}`)
        .attr("transform", `translate(${objet.x},${objet.y})`);
}

function stopGame() {
    // Arrêter la création et les déplacements des différents objets (ennemis, tirs)
    clearInterval(creationTirsJoueur);
    clearInterval(mouvementTirJoueur);
    clearInterval(creationKameks);
    clearInterval(mouvementKamek);
    clearInterval(creationTirsKamek);
    clearInterval(mouvementTirKamek);
    clearInterval(creationTirBoss);
    clearInterval(mouvementTirBoss);
    clearInterval(mouvementBoss);
    clearInterval(mouvementChampi)
}

function playGame() {
    // Réactiver la création et les déplacements des objets
    creationTirsJoueur = setInterval(nouveauxTirsJoueur, 800);
    mouvementTirJoueur = setInterval(deplacementTirJoueur, 50);
    creationKameks = setInterval(nouveauxKameks, 1900);
    mouvementKamek = setInterval(deplacementKamek, 50);
    creationTirsKamek = setInterval(nouveauxTirsKamek, 1600);
    mouvementTirKamek = setInterval(() => {
        deplacementTirEnnemi(tirs_kamek, 'tir_kamek')
    }, 50);
    mouvementTirBoss = setInterval(() => {
        deplacementTirEnnemi(tirs_boss, 'tir_boss')
    }, 50)

    if (boss) {
        creationTirBoss = setInterval(nouveauxTirsBoss, 1700);
        mouvementBoss = setInterval(deplacementBoss, 2200);
    }  
    mouvementChampi = setInterval(deplacementChampi, 10);

    // La div par-dessus l'espace de jeu disparait, ce qui permet de refaire déplacer Mario
    d3.select('.affichage_pause')
        .style('display', 'none');

    jeuEnPause = false;  // le jeu n'est plus en pause
}

function compteurVie() {
    d3.select('.vie').html('');

    for (let i = 0; i < vieJoueur; i++) {
        d3.select('.vie').append('img')
            .attr('src', 'img/vie.png')
            .attr('alt', 'vie')
    }

    // Si le joueur n'a plus qu'une vie, il change de forme et devient Mario normal qui lance une carapace
    if (vieJoueur == 1) {
        setTimeout(() => {
            joueur.attr('href', '#mario_normal');
        }, 150);
       
        d3.select('#tir_joueur')
            .style('transform', 'translateY(4px)')
            .attr('xlink:href', 'img/carapace.svg');
    }

    // Si le nombre de vie atteint 0, la partie est perdue
    if (vieJoueur == 0) {
        stopGame();
        jeuPerdu = true;

        // Affichage de l'élément HTML qui indique que la partie est perdue
        d3.select('.partie_perdue')
            .style('display', 'flex');

        d3.select('.game_over_score')
            .html(`Score : ${score}`);
        d3.select('.game_over_best_score')
            .html(`Meilleur score : ${meilleurScore}`);
    }

}

function compteurScore() {
    if (score > meilleurScore){
        window.localStorage.setItem('best', score);
        meilleurScore = score;
    } else if (meilleurScore == null){
        meilleurScore = 0;
    }
    d3.select('.score span').html(score);
    d3.select('.best-score span').html(meilleurScore);
}


function collision(a, b) {
    let dx = a.x - b.x;
    let dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// Animation du personnage (Mario ou Bowser) qui perd une vie
function touche(perso){
    perso.classed('touche', true);
    setTimeout(()=>{
        perso.classed('touche', false)
    }, 450)
}


function collisionRectangle(perso, tir, distanceX, distanceY) {
    let dx = Math.abs(perso.x - tir.x);
    let dy = Math.abs(perso.y - tir.y);
 
    if ((dx <= distanceX) && (dy <= distanceY)) {
        return true;
    }    
}

function stopMvtChampi(){
    clearInterval(deplacementChampi);
    d3.select('.champi-vert').style('display', 'none');
    clearInterval(mouvementChampi);
}

// Tirs
function nouveauxTirsJoueur() {
    // Ajout de nouvelles cases dans le tableau tirs
    tirs_joueur.push({
        x: joueur_coord.x,
        y: joueur_coord.y
    });
    creationSuppression(tirs_joueur, 'tir_joueur');
}

function deplacementTirJoueur() {
    tirs_joueur.forEach(d => {
        d.x += 10;
    })

    // Si le tir sort de la zone de jeu, il est supprimé
    if (suppressionDansTableau(tirs_joueur, d => d.x > 300)) {
        creationSuppression(tirs_joueur, 'tir_joueur');
    } else {
        position('tir_joueur');
    }

    // Si le tir du joueur touche le boss, le score augmente et le boss disparait
    if (boss){
        if (suppressionDansTableau(tirs_joueur, tir => collisionRectangle(boss_coord, tir, 14, 16))) {

            creationSuppression(tirs_joueur, 'tir_joueur');
            vieBoss--;
            touche(persoBoss);
  
            if (vieBoss == 0){
                boss = false;
                persoBoss.style('display', 'none');
                clearInterval(mouvementBoss);
                clearInterval(creationTirBoss);

                score += 100;
                compteurScore();
            } else if (vieBoss == 1){
                setTimeout(() => {
                    persoBoss.attr('href', '#boss_squelette');
                }, 150);
            }

        } else {
            updateCoords(boss_coord, 'boss');
            position('tir_joueur');
        }
    }

}


// Kameks
function nouveauxKameks() {
    // Ajout de nouvelles cases dans le tableau kameks
    // Les coordoonnées y sont aléatoires
    let randomCoord = Math.random() * (185 - 4) + 4;
    kameks.push({
        x: '300',
        y: randomCoord
    });
    creationSuppression(kameks, 'kamek');
}

function deplacementKamek() {
    kameks.forEach(d => {
        d.x -= 1.5;
    })

    // Si kamek touche le bord, il est supprimé et le joueur perd une vie
    if (suppressionDansTableau(kameks, d => d.x < 75)) {
        creationSuppression(kameks, 'kamek');

        vieJoueur--;
        compteurVie();

    } else {
        position('kamek');
    }

    // Si le tir du joueur touche kamek, il est supprimé et le score augmente de 10 points
    if (suppressionDansTableau(kameks, kamek =>
            suppressionDansTableau(tirs_joueur, tir => collision(kamek, tir) < 8.8))) {

        creationSuppression(kameks, 'kamek');
        creationSuppression(tirs_joueur, 'tir_joueur');

        score += 10;
        compteurScore();

        if ((score % 200 == 0) && (boss == false)) {
            Boss();
        }

        if (score % 150 == 0) {
            champignonVert();
        }

    } else {
        position('kamek');
        position('tir_joueur');
    }

}

function nouveauxTirsKamek() {
    kameks.forEach(e => {
        tirs_kamek.push({
            x: e.x - 5,
            y: e.y
        })
    })
    creationSuppression(tirs_kamek, 'tir_kamek');
}

// Boss
function Boss() {
    boss = true;         // Un boss est arrivé
    boss_coord.x = 300;
    boss_coord.y = Math.round(Math.random() * (185 - 4) + 4);
    vieBoss = 2;

    persoBoss.attr('href', '#boss');

    let apparitionBoss = setInterval(() => {
        // Si l'élément est en display block avant cet interval, Bowser apparait au point (0,0) car boss_coord n'est pas encore défini
        persoBoss.style('display', 'block');

        boss_coord.x -= 2;
        updateCoords(boss_coord, 'boss');
        
        // Bowser a une position en abscisse fixe à 284px
        if (boss_coord.x == 284) {
            clearInterval(apparitionBoss);
        }
    }, 50);

    creationTirBoss = setInterval(nouveauxTirsBoss, 1700)
    mouvementBoss = setInterval(deplacementBoss, 2200);
}

function deplacementBoss() {
    let randomCoord = Math.round(Math.random() * (185 - 4) + 4);

    // Si le point aléatoire se trouve au-dessus de la position actuelle de Bowser
    if (randomCoord < boss_coord.y) {
        //  Diminuer la valeur de y jusqu'à qu'elle atteigne la valeur de randomcoord
        var pas = -1;
    } else {
        // Sinon augmenter
        var pas = 1;
    }

    let mouvementBoss = setInterval(() => {
        boss_coord.y += pas;
        updateCoords(boss_coord, 'boss');

        if (boss_coord.y == randomCoord) {
            clearInterval(mouvementBoss);
        }
    }, 20)
   
}

function nouveauxTirsBoss() {
        tirs_boss.push({
            x: boss_coord.x - 5,
            y: boss_coord.y
        })
    creationSuppression(tirs_boss, 'tir_boss');
}


function deplacementTirEnnemi(tableau, classe) {
    tableau.forEach(e => {
        e.x -= 5;
    })

    // Si le tir kamek sort de la zone de jeu, il est supprimé
    if (suppressionDansTableau(tableau, d => d.x < 0)) {
        creationSuppression(tableau, classe);

    } else {
        position(classe);
    }

    // Si le tir kamek touche le joueur, il disparait et le joueur perd une vie
    if (suppressionDansTableau(tableau, tir => collisionRectangle(joueur_coord, tir, 14, 11))) {

        creationSuppression(tableau, classe);

        vieJoueur--;
        touche(joueur);
        compteurVie();

    } else {
        position(classe);
    }
}

// Champignon vert = vie +1
function champignonVert() {
    champi_coord = {
        x : 300,
        y :  Math.round(Math.random() * (185 - 4) + 4)
    };
    d3.select('.champi-vert').style('display', 'block');
    mouvementChampi= setInterval(deplacementChampi, 10);
}

function deplacementChampi(){
    champi_coord.x--;
    updateCoords(champi_coord, 'champi-vert');
    
    if (collisionRectangle(joueur_coord, champi_coord, 10, 13)){
        vieJoueur++;
        compteurVie();
        stopMvtChampi();

        // Un champignon pop au-dessus de Mario pour annoncer qu'il a bien gagné une vie
        d3.select('.champi-pop')
            .style('display', 'block')
            .attr('transform', `translate(${joueur_coord.x}, ${joueur_coord.y - 12})`);

        setTimeout(() => {
            d3.select('.champi-pop')
            .style('display', 'none');
        }, 250);
    }

    if (champi_coord.x == 0) {
        stopMvtChampi();
    }
}


// Mettre le jeu en pause en appuyant sur la touche 'espace'
d3.select('body').on('keypress', function (e) {
    if (jeuPerdu == false){
        if (e.key == ' ' && jeuEnPause == false) {
            stopGame()

            d3.select('.affichage_pause')
                .style('display', 'flex');

            jeuEnPause = true;
        } else if (e.key == ' ' && jeuEnPause == true) {
            // A l'appui de la touche 'espace', si le jeu est déjà sur pause, le jeu est relancé
            playGame();
        }
    }
})

// Relancer la partie en cliquant sur le bouton play quand le jeu est en pause
pause.on('mouseover', function () {
    pause.attr('src', 'img/play.png')
})
pause.on('mouseout', function () {
    pause.attr('src', 'img/pause.png')
})

pause.on('click', function () {
    playGame();
})

// Rejouer
d3.select('.restart').on('click', function () {
    location.reload();
})

compteurVie();
compteurScore();

let creationTirsJoueur = setInterval(nouveauxTirsJoueur, 700);
let mouvementTirJoueur = setInterval(deplacementTirJoueur, 50);
let creationKameks = setInterval(nouveauxKameks, 1900);
let mouvementKamek = setInterval(deplacementKamek, 50);
let creationTirsKamek = setInterval(nouveauxTirsKamek, 1600);
let mouvementTirKamek = setInterval(() => {
    deplacementTirEnnemi(tirs_kamek, 'tir_kamek')
}, 50);

// Cette fonction n'est pas appelée dans la fonction Boss() car elle serait ré-appelée à chaque fois qu'un boss apparait, et rend ainsi la vitesse de déplacement du tir plus élevée
// De plus, elle doit être constamment active pour que le tir du boss ne s'arrête pas au milieu de la zone de jeu quand un boss est éliminé
mouvementTirBoss = setInterval(() => {
    deplacementTirEnnemi(tirs_boss, 'tir_boss')
}, 50)