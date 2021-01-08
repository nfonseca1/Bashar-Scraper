class Event extends React.Component {
    constructor(props) {
        super(props);
        this.state = {audioTime: this.props.content[0][0].time, audioClip: null, showSpeakers: true, highlight: true}
        this.setAudioTime = this.setAudioTime.bind(this);
        this.setAudioClip = this.setAudioClip.bind(this);
        this.toggleSpeakers = this.toggleSpeakers.bind(this);
        this.toggleHighlighting = this.toggleHighlighting.bind(this);
    }
    setAudioClip(clip) {
        this.setState({audioClip: clip})
    }
    setAudioTime(time) {
        this.setState({audioTime: time})
    }
    toggleSpeakers() {
        this.state.showSpeakers ? this.setState({showSpeakers: false}) : this.setState({showSpeakers: true});
    }
    toggleHighlighting() {
        this.state.highlight ? this.setState({highlight: false}) : this.setState({highlight: true});
    }
    render() {
        let jsx = [];
        for (let words of this.props.content) {
            jsx.push(<Snippet 
                words={words} 
                keys={this.props.keys} 
                audioTime={this.state.audioTime} 
                audioClip={this.state.audioClip}
                showSpeakers={this.state.showSpeakers}
                highlight={this.state.highlight}>
                </Snippet>)
        }

        return (
            <div className="Event">
                <div className="event-head">
                    <h1 className="event-title">{this.props.eventName}</h1>
                    <Audio name={this.props.eventName} time={this.state.audioTime} setAudioTime={this.setAudioTime} setAudioClip={this.setAudioClip}></Audio>
                </div>
                <div className="event-tools">
                    <button onClick={this.toggleSpeakers} className="button speaker-toggle-btn">Speakers</button>
                    <button onClick={this.toggleHighlighting} className="button highlight-toggle-btn">Highlighting</button>
                </div>
                {jsx}
            </div>
        )
    }
}