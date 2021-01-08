class Snippet extends React.Component {
    render() {
        let keys = this.props.keys.map(w => w.split(" "));
        let jsx = [];
        let words = this.props.words;
        let lastSpeaker = words[0].speaker;
        for (let i = 0; i < words.length; i++) {
            if (words[i].speaker !== lastSpeaker) {
                jsx.push(<h4>{words[i].speaker}</h4>);
                lastSpeaker = words[i].speaker;
            }

            let lastIdx = i;
            for (let key of keys) {
                let match = true;
                for (let w = 0; w < key.length; w++) {
                    let lastChar = words[i + w].word[words[i + w].word.length - 1];
                    let filteredWord = (lastChar === "." || lastChar === "?" || lastChar === "," || lastChar === "!") 
                        ? words[i + w].word.slice(0, words[i + w].word[words[i + w].length - 1])
                        : words[i + w].word;
                    if (filteredWord.toLowerCase() !== key[w].toLowerCase()) {
                        match = false;
                        break;
                    }
                }
                if (!match) continue;
                for (let w = 0; w < key.length; w++) {
                    jsx.push(<Word 
                        word={words[i + w].word} 
                        time={words[i + w].time}
                        isHighlighted={this.props.audioTime >= words[i + w].time ? true : false}
                        isKeyword={true}
                        audioClip={this.props.audioClip}>
                        </Word>)
                }
                i += key.length;
                break;
            } 

            if (i === lastIdx) {
                jsx.push(<Word 
                    word={words[i].word} 
                    time={words[i].time}
                    isHighlighted={this.props.audioTime >= words[i].time ? true : false}
                    isKeyword={false}
                    audioClip={this.props.audioClip}>
                    </Word>)
            }
            else i -= 1;
        }

        return (
            <div className="Snippet">
                <h3>{words[0].speaker} - {words[0].time}</h3>
                {jsx}
            </div>
        )
    }
}