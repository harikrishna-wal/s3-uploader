// @flow
import React, { Component } from 'react';
import { render } from "react-dom";
import routes from '../constants/routes';
import styles from './Upload.global.css';
import { Button, Label, Link } from 'react-desktop/macOs';
import axios, { post, get } from 'axios';
import {ToastContainer, ToastStore} from 'react-toasts';
import ReactTable from "react-table";
import moment from 'moment';

export class SpinnerComponent extends React.Component{
  constructor(props){
    super(props);
  }
  render() {
    return (
      <div>
          <img src="spinner.gif"/>
      </div>
    );
  }
}

export default class Upload extends React.Component{
  constructor(props) {
    super(props);
    this.state ={
      file: null,
      showSpinner: false,
      listOfFiles: []
    }
    this.onFormSubmit = this.onFormSubmit.bind(this)
    this.onChange = this.onChange.bind(this)
    this.fileUpload = this.fileUpload.bind(this)
    this.getFilesData = this.getFilesData.bind(this)
    this.downloadFile = this.downloadFile.bind(this)
  }

  downloadFile(file) {
    axios({
        url: 'http://localhost:3000/download/'+file,
        method: 'GET',
        responseType: 'blob',
      }).then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', file);
        document.body.appendChild(link);
        link.click();
      });
  }

  componentDidMount() {
    this.getFilesData()
  }

  getFilesData(){
    get('http://localhost:3000/list-files').then(response => {
      let listOfFiles = [];
      response.data.files.map(function(key) {
        let dateFormat = 'YYYY-DD-MM HH:mm:ss';
        let testDateUtc = moment.utc(key.uploaded_on);
        let localDate = testDateUtc.local();
        listOfFiles.push({'id': key._id, 'file_name': key.file_name, 'file_type': key.file_type, 'file_size': Math.round(key.file_size/1000) + ' KB', 'uploaded_on': localDate.format(dateFormat), 's3_url': key.s3_url, 'local_url': key.local_url})
      });
      this.setState({listOfFiles: listOfFiles});
    });
  }

  onFormSubmit(e){
    e.preventDefault();
    if(this.state.file != null)
    this.setState({showSpinner: true});
    this.fileUpload(this.state.file).then((response)=>{
      if(typeof response.data.success != 'undefined' && response.data.success) {
        if(typeof response.data.connectivityProb != 'undefined') {
          ToastStore.error(response.data.connectivityProb);
        }
        ToastStore.success(response.data.msg)
        this.refs.uploadFile.value = '';
        this.state.file = '';
        this.setState({showSpinner: false});
        this.getFilesData();
      } else {
        ToastStore.error(response.data.err);
        this.setState({showSpinner: false});
      }
    })
    .catch((err) => {
      ToastStore.error(err.response.data.err);
      this.setState({showSpinner: false});
    });
  }
  onChange(e) {
    this.setState({file:e.target.files[0]})
  }

  fileUpload(file){
    const url = 'http://localhost:3000/upload';
    const formData = new FormData();
    formData.append('file',file)
    const config = {
        headers: {
            'content-type': 'multipart/form-data'
        }
    }
    return post(url, formData, config);
  }

  render() {
    return (
      <div className={styles.container} data-tid="container">
          <form onSubmit={this.onFormSubmit}>
            <h1>S3 Uploader</h1>
            <input type="file" onChange={this.onChange} ref="uploadFile" accept='application/msword, application/pdf, image/*'/>
            <Button color="blue" type="submit">
              Upload to S3
            </Button>

            <ToastContainer store={ToastStore} position={ToastContainer.POSITION.TOP_RIGHT} lightBackground/>
            { this.state.showSpinner ? <SpinnerComponent/> : null }
          </form>
          <br/>
          <ReactTable
          data={this.state.listOfFiles}
          columns={[
            {
              columns: [
                {
                  Header: "File Name",
                  accessor: "file_name",
                  minWidth: 200
                },
                {
                  Header: "File Type",
                  accessor: "file_type",
                  minWidth: 200,
                  sortable: false
                },
                {
                  Header: "File Size",
                  accessor: "file_size",
                  minWidth: 100
                },
                {
                  Header: "Uploaded On",
                  accessor: "uploaded_on",
                  minWidth: 200
                },
                {
                  Header: "Action",
                  Cell: row => (
                    <div>
                      <span><i className="fas fa-edit"></i></span>
                      <span> / </span>
                      <span><i className="fas fa-times"></i></span>
                      <span> / </span>
                      <span onClick={() => this.downloadFile(row.original.file_name)}><i className="fas fa-file-download hover"></i></span>
                    </div>
                  ),
                  minWidth: 200
                }
              ]
            }
          ]}
          defaultPageSize={5}
          className="-striped -highlight"
          SubComponent={row => {
            return (
              <div>
                <Label>
                  Local url :
                  <Link color="white">
                    {row.original.s3_url}
                  </Link>
                </Label>
              </div>
            )
          }}
        />
      </div>
    );
  }
}
