class Word extends React.Component {
    constructor(props) {
        super(props);
        this.handleClick = this.handleClick.bind(this);
    }
    handleClick() {
        this.props.audioClip.currentTime = this.props.time;
    }
    render() {
        let className = `Word ${this.props.isHighlighted ? 'highlighted' : ''} ${this.props.isKeyword ? 'keyword' : ''}`;
        return <span onClick={this.handleClick} className={className}>{this.props.word} </span>
    }
}