class Event extends React.Component {
    render() {
        let jsx = [];
        for (let words of this.props.content) {
            jsx.push(<Snippet words={words}></Snippet>)
        }

        return (
            <div className="Event">
                <h1>{this.props.eventName}</h1>
                {jsx}
            </div>
        )
    }
}