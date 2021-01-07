class ResultList extends React.Component {
    render() {
        let data = this.props.data;
        let jsx = [];
        for (let i = 0; i < data.length; i++) {
            if (data[i].content.length === 0) continue;
            jsx.push(<Event eventName={data[i].eventName} content={data[i].content}></Event>);
        }
        return (
            <div className="ResultList">
                {jsx}
            </div>
        )
    }
}