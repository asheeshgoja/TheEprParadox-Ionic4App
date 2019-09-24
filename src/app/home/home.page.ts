import { Component } from '@angular/core';
import { Camera, CameraOptions } from '@ionic-native/camera/ngx';
import { HTTP } from '@ionic-native/http/ngx';
import { File } from '@ionic-native/file/ngx';
import { WebView } from '@ionic-native/ionic-webview/ngx';


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  tensor_response: string;
  good_box_confidence_factor: number;
  damaged_box_confidence_factor: number;
  open_box_confidence_factor: number;
  pictureName: string  ;
  serverCallStatus : string = '';
  errorInfo : string = '';
  ipAddress : string = '35.245.234.215'

  constructor(private camera: Camera, private http: HTTP, private file: File, private webView: WebView) { }

  takePicture() {
    const options: CameraOptions = {
      quality: 50,
      targetWidth: 600,
      targetHeight: 600,
      destinationType: this.camera.DestinationType.DATA_URL,
      encodingType: this.camera.EncodingType.JPEG,
      mediaType: this.camera.MediaType.PICTURE
      // allowEdit: true
    }

    this.camera.getPicture(options).then((imageData) => {
      let base64Image = 'data:image/jpeg;base64,' + imageData;

      let postParams = {
        sampleFile: imageData
      }

      this.pictureName = null;

      let that = this;
      this.saveBase64ToFile(base64Image,  Math.random() + '-image.jpg').then(function (fileName) {
        that.pictureName = that.webView.convertFileSrc(that.file.dataDirectory + fileName); 
      });

      this.http.setDataSerializer('json');

      this.serverCallStatus = 'running tensor classifier...'
      this.errorInfo = ''; 

      this.http.post(`http://${this.ipAddress}/postImage`, postParams, { 'content-type': 'application/json' }
        //this.http.post('http://10.0.2.2/postImage', postParams,{'content-type':'application/json'} //looipback address  to emulator host
      )
        .then(response => {
          this.serverCallStatus = '';
          this.tensor_response = response.data;
          let data_arr = this.tensor_response.split(';')
          this.good_box_confidence_factor = Math.round(parseFloat(data_arr[0].split(',')[1]) * 100);
          this.open_box_confidence_factor = Math.round(parseFloat(data_arr[1].split(',')[1]) * 100);
          this.damaged_box_confidence_factor = Math.round(parseFloat(data_arr[2].split(',')[1]) * 100);

          console.log(response);
        })
        .catch(response => {
          this.errorInfo = response.error;
          this.serverCallStatus = '';
          console.log(response);
          console.log(response);
        });

    }, (err) => {
      this.errorInfo = err;
      this.serverCallStatus = '';
    });
  }

  saveBase64ToFile(base64: string, name: string): Promise<string> {
    return new Promise((resolve, reject) => {
      var realData = base64.split(",")[1]
      let blob = this.b64toBlob(realData, 'image/jpeg', 512)

      this.file.writeFile(this.file.dataDirectory, name, blob,{replace:true})
        .then(() => {
             resolve(name);
        })
        .catch((err) => {
          console.log('error writing blob')
          reject(err)
        })
    })
  }

  b64toBlob(b64Data, contentType, sliceSize) {
    contentType = contentType || '';
    sliceSize = sliceSize || 512;

    var byteCharacters = atob(b64Data);
    var byteArrays = [];

    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      var slice = byteCharacters.slice(offset, offset + sliceSize);

      var byteNumbers = new Array(slice.length);
      for (var i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      var byteArray = new Uint8Array(byteNumbers);

      byteArrays.push(byteArray);
    }

    var blob = new Blob(byteArrays, { type: contentType });
    return blob;
  }

}
