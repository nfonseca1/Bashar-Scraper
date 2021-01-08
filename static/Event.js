class Event extends React.Component {
    constructor(props) {
        super(props);
        this.state = {audioTime: this.props.content[0][0].time, audioClip: null}
        this.setAudioTime = this.setAudioTime.bind(this);
        this.setAudioClip = this.setAudioClip.bind(this);
    }
    setAudioClip(clip) {
        this.setState({audioClip: clip})
    }
    setAudioTime(time) {
        this.setState({audioTime: time})
    }
    render() {
        let jsx = [];
        for (let words of this.props.content) {
            jsx.push(<Snippet words={words} keys={this.props.keys} audioTime={this.state.audioTime} audioClip={this.state.audioClip}></Snippet>)
        }

        return (
            <div className="Event">
                <div className="event-head">
                    <h1 className="event-title">{this.props.eventName}</h1>
                    <Audio name={this.props.eventName} time={this.state.audioTime} setAudioTime={this.setAudioTime} setAudioClip={this.setAudioClip}></Audio>
                </div>
                {jsx}
            </div>
        )
    }
}