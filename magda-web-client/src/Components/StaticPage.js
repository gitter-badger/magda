import React from "react";
import { contents } from "../content/register";
import { config } from "../config";
import ReactDocumentTitle from "react-document-title";
import { Redirect } from "react-router-dom";
import "./StaticPage.css";

export default function StaticPage(props) {
    const id = props.match.params.id;
    const content = contents.get(id);
    if (content) {
        return (
            <ReactDocumentTitle title={(content.title ? content.title : id) + " | " + config.appName}>
                <div className={`container page-${id}`}>
                    <div className="row">
                        <div className="col-sm-8">
                            <h1> {content.title && content.title} </h1>
                            <div
                                className="markdown-body"
                                dangerouslySetInnerHTML={{
                                    __html: content.__content
                                }}
                            />
                        </div>
                    </div>
                </div>
            </ReactDocumentTitle>
        );
    }
    return <Redirect to={"/404"} />;
}
