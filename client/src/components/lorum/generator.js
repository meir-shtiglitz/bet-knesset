

export const Generator = () => {

    const letters = "אבגדהוזחטיכלמנסעפצקרשתםךףץן";
    const randNum = (min, max) => (Math.floor(Math.random() * (max - min)) + min)
    const randomLetter = () => letters[randNum(0,letters.length)];
    const word = () => {
        const wordLength = randNum(2,7);
        var newWord = '';
        for(let i = 0; i<wordLength; i++){
            console.log(wordLength)
            newWord += randomLetter();
        }
        console.log('newWord: ',newWord);
        return newWord;
    }
    const senc = () => {
        let newSenc = '';
        for(let i = 0; i<6; i++){
            newSenc+= word() + ' ';
        }
        return newSenc;
    }

    return(
        senc()
    )
}

