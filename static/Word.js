class Word extends React.Component {
    constructor(props) {
        super(props);
        this.handleClick = this.handleClick.bind(this);
    }
    handleClick() {
        this.props.audioClip.currentTime = this.props.time;
    }
    render() {
        let highlight = this.props.isHighlighted && this.props.highlight ? 'highlighted' : '';
        let keyword = this.props.isKeyword ? 'keyword' : '';
        let className = `Word ${highlight} ${keyword}`;
        return <span onClick={this.handleClick} className={className}>{this.props.word} </span>
    }
}