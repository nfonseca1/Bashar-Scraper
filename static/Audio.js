class Audio extends React.Component {
    constructor(props) {
        super(props);
        this.handleTimeUpdate = this.handleTimeUpdate.bind(this);
        this.myRef = React.createRef();
    }
    componentDidMount() {
        this.props.setAudioClip(this.myRef.current);
        this.myRef.current.currentTime = this.props.time;
    }
    shouldComponentUpdate() {
        return false;
    }
    handleTimeUpdate() {
        this.props.setAudioTime(this.myRef.current.currentTime)
    }
    render() {
        let name = this.props.name.toLowerCase().split(" ").join("+");
        let src = `https://nf-bashar-audio.s3.amazonaws.com/${name}.mp3`;
        return (
            <audio className="Audio" controls src={src} onTimeUpdate={this.handleTimeUpdate} ref={this.myRef}></audio>
        )
    }
}