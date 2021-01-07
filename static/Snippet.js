class Snippet extends React.Component {
    render() {
        let jsx = [];
        let words = this.props.words;
        let lastSpeaker = words[0].speaker;
        for (let i = 0; i < words.length; i++) {
            if (words[i].speaker !== lastSpeaker) {
                jsx.push(<h4>{words[i].speaker}</h4>);
                lastSpeaker = words[i].speaker;
            }
            jsx.push(<Word 
                word={words[i].word} 
                time={words[i].time}
                isHighlighted={this.props.audioTime >= words[i].time ? true : false}
                audioClip={this.props.audioClip}>
                </Word>)
        }

        return (
            <div className="Snippet">
                <h3>{words[0].speaker} - {words[0].time}</h3>
                {jsx}
            </div>
        )
    }
}