var canvasEditions = [];
var fontCaveat = null;
var copiedObject = null;
var forceAddLock = true;
var addLock = true;
var activeCanvas = null;
var activeCanvasPointer = null;
var pdfRenderTasks = [];
var pdfPages = [];
var svgCollections = [];
var resizeTimeout;
var pdfHistory = {};
var currentScale = 1.5;
var windowWidth = window.innerWidth;
var menu = null;
var menuOffcanvas = null;
var currentCursor = null;
var signaturePad = null;

var loadPDF = async function(pdfBlob, filename) {
    var pdfjsLib = window['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.js?legacy';

    let url = await URL.createObjectURL(pdfBlob);

    text_document_name.querySelector('span').innerText = filename;
    text_document_name.setAttribute('title', filename);

    let dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File([pdfBlob], filename, {
        type: 'application/pdf'
    }));
    if(document.getElementById('input_pdf')) {
        document.getElementById('input_pdf').files = dataTransfer.files;
    }
    if(document.getElementById('input_pdf_share')) {
        document.getElementById('input_pdf_share').files = dataTransfer.files;
    }
    var loadingTask = pdfjsLib.getDocument(url);
    loadingTask.promise.then(function(pdf) {

        if(pdf.numPages > maxPage) {
            alert("Le PDF de doit pas dépasser "+maxPage+" pages");
            document.location = "/";
            return;
        }
        for(var pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++ ) {
            pdf.getPage(pageNumber).then(function(page) {
              var scale = 1.5;
              var viewport = page.getViewport({scale: scale});
              if(viewport.width > document.getElementById('container-pages').clientWidth - 40) {
                  viewport = page.getViewport({scale: 1});
                  scale = (document.getElementById('container-pages').clientWidth - 40) / viewport.width;
                  viewport = page.getViewport({ scale: scale });
              }

              currentScale = scale;

              var pageIndex = page.pageNumber - 1;

              document.getElementById('form_block').insertAdjacentHTML('beforeend', '<input name="svg[' + pageIndex + ']" id="data-svg-' + pageIndex + '" type="hidden" value="" />');
              document.getElementById('container-pages').insertAdjacentHTML('beforeend', '<div class="position-relative mt-1 ms-1 me-1 d-inline-block" id="canvas-container-' + pageIndex +'"><canvas id="canvas-pdf-'+pageIndex+'" class="shadow-sm canvas-pdf"></canvas><div class="position-absolute top-0 start-0"><canvas id="canvas-edition-'+pageIndex+'"></canvas></div></div>');

              var canvasPDF = document.getElementById('canvas-pdf-' + pageIndex);
              var canvasEditionHTML = document.getElementById('canvas-edition-' + pageIndex);
              // Prepare canvas using PDF page dimensions
              var context = canvasPDF.getContext('2d');
              canvasPDF.height = viewport.height;
              canvasPDF.width = viewport.width;
              canvasEditionHTML.height = canvasPDF.height;
              canvasEditionHTML.width = canvasPDF.width;

              var renderContext = {
                canvasContext: context,
                viewport: viewport,
                enhanceTextSelection: true
              };
              var renderTask = page.render(renderContext);
              pdfRenderTasks.push(renderTask);
              pdfPages.push(page);
              var canvasEdition = new fabric.Canvas('canvas-edition-' + pageIndex, {
                selection : false,
                allowTouchScrolling: true
              });

              document.getElementById('canvas-container-' + pageIndex).addEventListener('drop', function(event) {
                  var input_selected = document.querySelector('input[name="svg_2_add"]:checked');
                  if(!input_selected) {
                      return;
                  }

                  createAndAddSvgInCanvas(canvasEdition, input_selected.value, event.layerX, event.layerY, input_selected.dataset.height);
                  input_selected.checked = false;
                  input_selected.dispatchEvent(new Event("change"));
              });
              canvasEdition.on('mouse:move', function(event) {
                  activeCanvas = this;
                  activeCanvasPointer = event.pointer;
              });
              canvasEdition.on('mouse:down:before', function(event) {
                  currentCursor = this.defaultCursor;
              });
              canvasEdition.on('mouse:down', function(event) {
                  if(event.target) {
                      this.defaultCursor = 'default';
                      return;
                  }
                  var input_selected = document.querySelector('input[name="svg_2_add"]:checked');
                  if(currentCursor == 'default' && input_selected) {
                       this.defaultCursor = 'copy';
                  }
                  if(currentCursor != 'copy') {
                      return;
                  }
                  if(!input_selected) {
                      return;
                  }

                  createAndAddSvgInCanvas(this, input_selected.value, event.pointer.x, event.pointer.y, input_selected.dataset.height);

                  if(addLock) {
                      return;
                  }
                  input_selected.checked = false;
                  input_selected.dispatchEvent(new Event("change"));
              });
              canvasEdition.on('object:scaling', function(event) {
                  if(event.transform.action == "scaleX") {
                      event.target.scaleY = event.target.scaleX;
                  }
                  if(event.transform.action == "scaleY") {
                      event.target.scaleX = event.target.scaleY;
                  }
              });
              canvasEdition.on('object:scaled', function(event) {
                  var item = getSvgItem(event.target.svgOrigin);
                  if(!item) {
                      return;
                  }
                  item.scale = event.target.width * event.target.scaleX / event.target.canvas.width;
                  storeCollections();
              });
              canvasEdition.on("text:changed", function(event) {
                   if (!event.target instanceof fabric.IText) {
                       return;
                   }
                  const textLinesMaxWidth = event.target.textLines.reduce((max, _, i) => Math.max(max, event.target.getLineWidth(i)), 0);
                  event.target.set({width: textLinesMaxWidth});
              });
              canvasEditions.push(canvasEdition);
            });
        }
    }, function (reason) {
        console.error(reason);
    });
};

var is_mobile = function() {
    return !(window.getComputedStyle(document.getElementById('is_mobile')).display === "none");
};

var responsiveDisplay = function() {
    if(is_mobile()) {
        document.getElementById('page-signature').style.paddingRight = "inherit";
        menu.classList.remove('show');
        menuOffcanvas.hide();
        document.getElementById('container-pages').classList.remove('vh-100');
    } else {
        menuOffcanvas.show();
        document.getElementById('page-signature').style.paddingRight = "350px";
        document.getElementById('container-pages').classList.add('vh-100');
    }
    menu.classList.remove('d-md-block');
    menu.classList.remove('d-none');
};

var storeCollections = function () {
    localStorage.setItem('svgCollections', JSON.stringify(svgCollections));
};

var getSvgItem = function(svg) {
    for (index in svgCollections) {
        svgItem = svgCollections[index];
        if(svgItem.svg == svg) {

            return svgItem;
        }
    }

    return null;
};

var svgClick = function(label, event) {
    if(event.detail == 1) {
        label.dataset.lock = parseInt(addLock*1);
    }
    if(event.detail > 1){
        stateAddLock(parseInt(label.dataset.lock*1) != 1);
    }
    if(event.detail > 1) {
        return;
    }
    if(!document.getElementById(label.htmlFor)) {
        return;
    }
    if(!document.getElementById(label.htmlFor).checked) {
        return;
    }
    document.getElementById(label.htmlFor).checked = false;
    document.getElementById(label.htmlFor).dispatchEvent(new Event("change"));
    event.preventDefault();
};

var svgDblClick = function(label, event) {
    if(parseInt(label.dataset.lock*1) == 1) {
        return;
    }
    stateAddLock(true);
};

var svgDragStart = function(label, event) {
    document.getElementById(label.htmlFor).checked = true;
    document.getElementById(label.htmlFor).dispatchEvent(new Event("change"));
};

var svgChange = function(input, event) {
    if(input.checked) {
        document.getElementById('btn_svn_select').classList.add('d-none');
        document.getElementById('svg_object_actions').classList.add('d-none');
        document.getElementById('svg_selected_container').classList.remove('d-none');
        if(input.value.match(/^data:/)) {
            document.getElementById('svg_selected').src = input.value;
        } else {
            document.getElementById('svg_selected').src = input.dataset.svg;
        }
    } else {
        document.getElementById('btn_svn_select').classList.remove('d-none');
        document.getElementById('svg_object_actions').classList.add('d-none');
        document.getElementById('svg_selected_container').classList.add('d-none');
        document.getElementById('svg_selected').src = "";
    }

    stateAddLock(false);

    var input_selected = document.querySelector('input[name="svg_2_add"]:checked');

    if(input_selected && !input_selected.value.match(/^data:/) && input_selected.value != "text") {
        input_selected = null;
    }

    document.querySelectorAll('.btn-svg').forEach(function(item) {
        if(input_selected && item.htmlFor == input_selected.id) {
            item.style.setProperty('cursor', 'copy');
        } else {
            item.style.removeProperty('cursor');
        }
    });

    canvasEditions.forEach(function(canvasEdition, index) {
        if(input_selected) {
            canvasEdition.defaultCursor = 'copy';
        } else {
            canvasEdition.defaultCursor = 'default';
        }
    })
    if(is_mobile()) {
        menuOffcanvas.hide();
    }
};

var getHtmlSvg = function(svg, i) {
    var inputRadio = document.createElement('input');
    inputRadio.type = "radio";
    inputRadio.classList.add("btn-check");
    inputRadio.id="radio_svg_"+i;
    inputRadio.name = "svg_2_add";
    inputRadio.autocomplete = "off";
    inputRadio.value = svg.svg;
    inputRadio.addEventListener('change', function() {
        svgChange(this, event);
    });
    var svgButton = document.createElement('label');
    svgButton.id = "label_svg_"+i;
    svgButton.classList.add('position-relative');
    svgButton.classList.add('btn');
    svgButton.classList.add('btn-svg');
    svgButton.classList.add('btn-outline-secondary');
    svgButton.htmlFor = "radio_svg_"+i;
    if(svg.type == 'signature') {
        svgButton.innerHTML += '<i class="bi bi-vector-pen text-black align-middle float-start"></i>';
    }
    if(svg.type == 'initials') {
        svgButton.innerHTML += '<i class="bi bi-type text-black align-middle float-start"></i>';
    }
    if(svg.type == 'rubber_stamber') {
        svgButton.innerHTML += '<i class="bi bi-card-text text-black align-middle float-start"></i>';
    }
    if(svg.type) {
        document.querySelector('.btn-add-svg-type[data-type="'+svg.type+'"]').classList.add('d-none');
    }
    svgButton.innerHTML += '<a title="Supprimer" data-index="'+i+'" class="btn-svg-list-suppression opacity-50 link-dark position-absolute" style="right: 6px; top: 2px;"><i class="bi bi-trash"></i></a>';
    svgButton.draggable = true;
    svgButton.addEventListener('dragstart', function(event) {
        svgDragStart(this, event);
    });
    svgButton.addEventListener('click', function(event) {
        svgClick(this, event);
    });
    svgButton.addEventListener('dblclick', function(event) {
        svgDblClick(this, event);
    });
    svgButton.addEventListener('mouseout', function(event) {
        this.style.removeProperty('cursor');
    })
    var svgImg = document.createElement('img');
    svgImg.src = svg.svg;
    svgImg.draggable = false;
    svgImg.style = "max-width: 180px;max-height: 70px;";
    svgButton.appendChild(svgImg);
    var svgContainer = document.createElement('div');
    svgContainer.classList.add('d-grid');
    svgContainer.classList.add('gap-2');
    svgContainer.appendChild(inputRadio);
    svgContainer.appendChild(svgButton);

    return svgContainer;
};

var stateAddLock = function(state) {
    if(forceAddLock) {
        state = true;
    }
    var checkbox = document.getElementById('add-lock-checkbox');
    var input_selected = document.querySelector('input[name="svg_2_add"]:checked');

    addLock = state;

    if(!input_selected) {
        addLock = false;
        checkbox.disabled = true;
    } else {
        checkbox.disabled = false;
    }

    /*document.querySelectorAll('.btn-svg').forEach(function(item) {
        item.style.borderWidth = "1px";
    });*/

    if(addLock && input_selected) {
        var svgButton = document.querySelector('.btn-svg[for="'+input_selected.id+'"]');
        //svgButton.style.borderWidth = "2px";
        checkbox.checked = true;
        return;
    }

    checkbox.checked = false;
};

var displaysSVG = function() {
    document.getElementById('svg_list').innerHTML = "";
    document.getElementById('svg_list_signature').innerHTML = "";
    document.getElementById('svg_list_initials').innerHTML = "";
    document.getElementById('svg_list_rubber_stamber').innerHTML = "";
    document.querySelectorAll('.btn-add-svg-type').forEach(function(item) {
        item.classList.remove('d-none');
    });
    svgCollections.forEach((svg, i) => {
        var svgHtmlChild = getHtmlSvg(svg, i);
        if(svg.type) {
            document.getElementById('svg_list_'+svg.type).appendChild(svgHtmlChild);
            return;
        }
        document.getElementById('svg_list').appendChild(svgHtmlChild);
    });

    if(svgCollections.length > 0) {
        document.getElementById('btn-add-svg').classList.add('btn-light');
        document.getElementById('btn-add-svg').classList.remove('btn-primary');
    }

    if(document.getElementById('btn-add-svg').classList.contains('btn-primary')) {
        document.getElementById('btn-add-svg').focus();
    }

    document.querySelectorAll('.btn-svg-list-suppression').forEach(function(item) {
        item.addEventListener('click', function() {
            svgCollections.splice(this.dataset.index, 1);
            displaysSVG();
            storeCollections();
        });
    });
};

function dataURLtoBlob(dataurl) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
};

function svgToDataUrl(svg) {

    return "data:image/svg+xml;base64,"+btoa(svg);
};

function trimSvgWhitespace(svgContent) {
    if(!svgContent) {

        return null;
    }
    var svgContainer = document.createElement("div")
    svgContainer.classList.add('invisible');
    svgContainer.classList.add('position-absolute');
    svgContainer.classList.add('top-0');
    svgContainer.classList.add('start-0');
    svgContainer.style = "z-index: -1;";
    svgContainer.innerHTML = svgContent;
    document.body.appendChild(svgContainer);
    var svg = svgContainer.querySelector('svg');
    var box = svg.getBBox();
    svg.setAttribute("viewBox", [box.x, box.y, box.width, box.height].join(" "));
    svgContent = svgContainer.innerHTML;
    document.body.removeChild(svgContainer)

    return svgContent = svgContainer.innerHTML;
};

var uploadSVG = function(formData) {
    document.getElementById('btn_modal_ajouter').setAttribute('disabled', 'disabled');
    document.getElementById('btn_modal_ajouter_spinner').classList.remove('d-none');
    document.getElementById('btn_modal_ajouter_check').classList.add('d-none');

    xhr = new XMLHttpRequest();

    xhr.open( 'POST', document.getElementById('form-image-upload').action, true );
    xhr.onreadystatechange = function () {
        var svgImage = svgToDataUrl(trimSvgWhitespace(this.responseText));
        document.getElementById('img-upload').src = svgImage;
        document.getElementById('img-upload').classList.remove("d-none");
        document.getElementById('btn_modal_ajouter').removeAttribute('disabled');
        document.getElementById('btn_modal_ajouter_spinner').classList.add('d-none');
        document.getElementById('btn_modal_ajouter_check').classList.remove('d-none');
        document.getElementById('btn_modal_ajouter').focus();
    };
    xhr.send( formData );
};

var deleteActiveObject = function() {
    canvasEditions.forEach(function(canvasEdition, index) {
        canvasEdition.getActiveObjects().forEach(function(activeObject) {
            canvasEdition.remove(activeObject);
        });
    })
};

var addObjectInCanvas = function(canvas, item) {
    item.on('selected', function(event) {
        if(!is_mobile()) {
            return;
        }
        document.getElementById('svg_object_actions').classList.remove('d-none');
        document.getElementById('svg_selected_container').classList.add('d-none');
        document.getElementById('btn_svn_select').classList.add('d-none');
    });

    item.on('deselected', function(event) {
        if(!is_mobile()) {
            return;
        }
        if(document.querySelector('input[name="svg_2_add"]:checked')) {
            document.getElementById('svg_selected_container').classList.remove('d-none');
        } else {
            document.getElementById('btn_svn_select').classList.remove('d-none');
        }
        document.getElementById('svg_object_actions').classList.add('d-none');
    });

    return canvas.add(item);
};

var createAndAddSvgInCanvas = function(canvas, item, x, y, height = null) {
    if(document.getElementById('save')) {
        document.getElementById('save').removeAttribute('disabled');
    }
    if(document.getElementById('save_mobile')) {
        document.getElementById('save_mobile').removeAttribute('disabled');
    }
    if(document.getElementById('btn_download')) {
        document.getElementById('btn_download').classList.remove('btn-outline-dark');
        document.getElementById('btn_download').classList.add('btn-outline-secondary');
    }
    if(document.getElementById('btn_share')) {
        document.getElementById('btn_share').classList.remove('btn-outline-dark');
        document.getElementById('btn_share').classList.add('btn-outline-secondary');
    }


    if(!height) {
        height = 100;
    }

    if(item == 'text') {
        var textbox = new fabric.Textbox('Texte à modifier', {
        left: x,
        top: y - 20,
        fontSize: 20,
        fontFamily: 'Monospace'
      });

      addObjectInCanvas(canvas, textbox).setActiveObject(textbox);
      textbox.keysMap[13] = "exitEditing";
      textbox.lockScalingFlip = true;
      textbox.enterEditing();
      textbox.selectAll();


      return;
    }

    fabric.loadSVGFromURL(item, function(objects, options) {
        var svg = fabric.util.groupSVGElements(objects, options);
        svg.svgOrigin = item;
        svg.lockScalingFlip = true;
        svg.scaleToHeight(height);
        if(svg.getScaledWidth() > 200) {
            svg.scaleToWidth(200);
        }
        var svgItem = getSvgItem(item);
        if(svgItem && svgItem.scale) {
            svg.scaleToWidth(canvas.width * svgItem.scale);
        }
        svg.top = y - (svg.getScaledHeight() / 2);
        svg.left = x - (svg.getScaledWidth() / 2);

        addObjectInCanvas(canvas, svg);
    });
};

var autoZoom = function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resizePDF, 100);
};

var zoomChange = function (inOrOut) {
    if(resizeTimeout) {
        return;
    }

    var deltaScale = 0.2 * inOrOut;

    if(currentScale + deltaScale < 0) {
        return
    }
    if(currentScale + deltaScale > 3) {
        return
    }

    clearTimeout(resizeTimeout);
    currentScale += deltaScale;

    resizeTimeout = setTimeout(resizePDF(currentScale), 50);
};

var resizePDF = function (scale = 'auto') {
    renderComplete = true;
    pdfRenderTasks.forEach(function(renderTask) {
        if(!renderTask) {
            renderComplete = false;
        }
    });

    if(!renderComplete) {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function(){ resizePDF(scale) }, 50);
        return;
    }

    pdfPages.forEach(function(page, pageIndex) {
        var renderTask = pdfRenderTasks[pageIndex];

        if(scale == 'auto' && page.getViewport({scale: 1.5}).width > document.getElementById('container-pages').clientWidth - 40) {
            scale = (document.getElementById('container-pages').clientWidth - 40) / page.getViewport({scale: 1}).width;
        }

        if(scale == 'auto') {
            scale = 1.5;
        }

        var viewport = page.getViewport({scale: scale});
        currentScale = scale;

        var canvasPDF = document.getElementById('canvas-pdf-' + pageIndex);
        var context = canvasPDF.getContext('2d');
        canvasPDF.height = viewport.height;
        canvasPDF.width = viewport.width;
        canvasEdition = canvasEditions[pageIndex];

        var scaleMultiplier = canvasPDF.width / canvasEdition.width;
        var objects = canvasEdition.getObjects();
        for (var i in objects) {
           objects[i].scaleX = objects[i].scaleX * scaleMultiplier;
           objects[i].scaleY = objects[i].scaleY * scaleMultiplier;
           objects[i].left = objects[i].left * scaleMultiplier;
           objects[i].top = objects[i].top * scaleMultiplier;
           objects[i].setCoords();
        }

        canvasEdition.setWidth(canvasEdition.getWidth() * scaleMultiplier);
        canvasEdition.setHeight(canvasEdition.getHeight() * scaleMultiplier);
        canvasEdition.renderAll();
        canvasEdition.calcOffset();

        var renderContext = {
          canvasContext: context,
          viewport: viewport,
          enhanceTextSelection: true
        };
        renderTask.cancel();
        pdfRenderTasks[pageIndex] = null;
        renderTask = page.render(renderContext);
        renderTask.promise.then(function () {
            pdfRenderTasks[pageIndex] = renderTask;
            clearTimeout(resizeTimeout);
            resizeTimeout = null;
        });
    });
};

var createEventsListener = function() {

    document.getElementById('add-lock-checkbox').addEventListener('change', function() {
        stateAddLock(this.checked);
    });

    document.querySelectorAll('.btn-add-svg-type').forEach(function(item) {
        item.addEventListener('click', function(event) {
            document.getElementById('input-svg-type').value = this.dataset.type;
            if(this.dataset.modalnav) {
                bootstrap.Tab.getOrCreateInstance(document.querySelector('#modalAddSvg #nav-tab '+this.dataset.modalnav)).show();
            }
        });
    });

    document.querySelectorAll('label.btn-svg').forEach(function(item) {
        item.addEventListener('dragstart', function(event) {
            svgDragStart(this, event);
        });
        item.addEventListener('click', function(event) {
            svgClick(this, event);
        });
        item.addEventListener('dblclick', function(event) {
            svgDblClick(this, event);
        });
    });

    document.querySelectorAll('input[name="svg_2_add"]').forEach(function (item) {
        item.addEventListener('change', function(event) {
            svgChange(this, event);
        });
    });

    document.getElementById('btn_modal_ajouter').addEventListener('click', function() {
        var svgItem = {};
        if(document.getElementById('input-svg-type').value) {
            svgItem.type = document.getElementById('input-svg-type').value;
        }
        if(document.getElementById('nav-draw-tab').classList.contains('active')) {
            svgItem.svg = document.getElementById('img-upload').src;
        }
        if(document.getElementById('nav-type-tab').classList.contains('active')) {
            var fontPath = fontCaveat.getPath(document.getElementById('input-text-signature').value, 0, 0, 42);
            var fabricPath = new fabric.Path(fontPath.toPathData());
            fabricPath.top = 0;
            fabricPath.left = 0;
            fabricPath.height = fabricPath.getScaledHeight();
            var textCanvas = document.createElement('canvas');
            textCanvas.width = fabricPath.getScaledWidth();
            textCanvas.height = fabricPath.getScaledHeight();
            var textCanvas = new fabric.Canvas(textCanvas);
            textCanvas.add(fabricPath).renderAll();
            svgItem.svg = svgToDataUrl(textCanvas.toSVG());
        }
        if(document.getElementById('nav-import-tab').classList.contains('active')) {
            svgItem.svg = document.getElementById('img-upload').src;
        }
        svgCollections.push(svgItem);
        displaysSVG();
        localStorage.setItem('svgCollections', JSON.stringify(svgCollections));

        var svg_list_id = "svg_list";
        if(svgItem.type) {
            svg_list_id = svg_list_id + "_" + svgItem.type;
        }

        document.querySelector('#'+svg_list_id+' label:last-child').click();
    });


    document.getElementById('signature-pad-reset').addEventListener('click', function(event) {
        signaturePad.clear();
        event.preventDefault();
    })

    document.querySelectorAll('#modalAddSvg .nav-link').forEach(function(item) { item.addEventListener('shown.bs.tab', function (event) {
        var firstInput = document.querySelector(event.target.dataset.bsTarget).querySelector('input');
        if(firstInput) {
            firstInput.focus();
        }
    })});

    document.getElementById('modalAddSvg').addEventListener('shown.bs.modal', function (event) {
        document.querySelector('#modalAddSvg #nav-tab button:first-child').focus();
        var tab = document.querySelector('#modalAddSvg .tab-pane.active');
        if(tab.querySelector('input')) {
            tab.querySelector('input').focus();
        }
        var input_selected = document.querySelector('input[name="svg_2_add"]:checked');
        if(input_selected) {
            input_selected.checked = false;
            input_selected.dispatchEvent(new Event("change"));
        }
    })

    document.getElementById('modalAddSvg').addEventListener('hidden.bs.modal', function (event) {
        signaturePad.clear();
        document.getElementById('btn_modal_ajouter').setAttribute('disabled', 'disabled');
        document.getElementById('input-svg-type').value = null;
        document.getElementById('input-text-signature').value = null;
        document.getElementById('input-image-upload').value = null;
        document.getElementById('img-upload').src = "";
        document.getElementById('img-upload').classList.add("d-none");
        bootstrap.Tab.getOrCreateInstance(document.querySelector('#modalAddSvg #nav-tab button:first-child')).show();
    })

    document.getElementById('input-text-signature').addEventListener('keydown', function(event) {
        document.getElementById('btn_modal_ajouter').removeAttribute('disabled');
        if(event.key == 'Enter') {
            document.getElementById('btn_modal_ajouter').click()
        }
    })

    document.getElementById('input-image-upload').addEventListener('change', function(event) {
        var data = new FormData();
        data.append('file', document.getElementById('input-image-upload').files[0]);
        uploadSVG(data);
        event.preventDefault();
    });

    if(document.getElementById('save')) {
        document.getElementById('save').addEventListener('click', function(event) {
            var dataTransfer = new DataTransfer();
            canvasEditions.forEach(function(canvasEdition, index) {
                dataTransfer.items.add(new File([canvasEdition.toSVG()], index+'.svg', {
                    type: 'image/svg+xml'
                }));
            })
            document.getElementById('input_svg').files = dataTransfer.files;
        });
    }

    if(document.getElementById('save_share')) {
        document.getElementById('save_share').addEventListener('click', function(event) {
            var dataTransfer = new DataTransfer();
            if(!document.getElementById('save').hasAttribute('disabled')) {
                canvasEditions.forEach(function(canvasEdition, index) {
                    dataTransfer.items.add(new File([canvasEdition.toSVG()], index+'.svg', {
                        type: 'image/svg+xml'
                    }));
                })
            }
            document.getElementById('input_svg_share').files = dataTransfer.files;
        });
    }

    document.getElementById('save_mobile').addEventListener('click', function(event) {
        document.getElementById('save').click();
    });

    document.getElementById('btn-svg-pdf-delete').addEventListener('click', function(event) {
        deleteActiveObject();
    });

    document.getElementById('btn_svg_selected_close').addEventListener('click', function(event) {
        var input_selected = document.querySelector('input[name="svg_2_add"]:checked');

        stateAddLock(false);
        input_selected.checked = false;
        input_selected.dispatchEvent(new Event("change"));
        this.blur();
    });

    document.addEventListener('click', function(event) {
        if(event.target.nodeName == "DIV") {

            var input_selected = document.querySelector('input[name="svg_2_add"]:checked');
            if(!input_selected) {
                return;
            }
            stateAddLock(false);
            input_selected.checked = false;
            input_selected.dispatchEvent(new Event("change"));
        }
    });

    document.addEventListener('keydown', function(event) {
        if(event.key == 'Escape' && (event.target.tagName == "BODY" || event.target.name == "svg_2_add")) {
            var input_selected = document.querySelector('input[name="svg_2_add"]:checked');
            if(!input_selected) {
                return;
            }
            input_selected.checked = false;
            stateAddLock(false);
            input_selected.dispatchEvent(new Event("change"));
            input_selected.blur();
            return;
        }
        if(event.target.tagName != "BODY") {
            return;
        }
        if(event.key == 'Delete') {
            deleteActiveObject();
            return;
        }

        if(event.ctrlKey && event.key == 'c') {
            if(!activeCanvas || !activeCanvas.getActiveObject()) {
                return;
            }
            copiedObject = fabric.util.object.clone(activeCanvas.getActiveObject());

            return;
        }

        if(event.ctrlKey && event.key == 'v') {
            copiedObject = fabric.util.object.clone(copiedObject);
            copiedObject.left = activeCanvasPointer.x;
            copiedObject.top = activeCanvasPointer.y;
            activeCanvas.add(copiedObject).renderAll();
            return;
        }

        if(event.ctrlKey && (event.key == 'à' || event.key == '0')) {
            autoZoom();
            event.preventDefault() && event.stopPropagation();

            return;
        }
        if(event.ctrlKey && (event.key == '=' || event.key == '+')) {
            zoomChange(1);
            event.preventDefault() && event.stopPropagation();

            return;
        }
        if(event.ctrlKey && event.key == '-') {
            zoomChange(-1);
            event.preventDefault() && event.stopPropagation();

            return;
        }
    });

    window.addEventListener('resize', function(event) {
        event.preventDefault() && event.stopPropagation();
        if(windowWidth == window.innerWidth) {
            return;
        }
        responsiveDisplay();
        windowWidth = window.innerWidth;
        autoZoom();
    });
    document.addEventListener('wheel', function(event) {
        if(!event.ctrlKey) {
            return;
        }
        event.preventDefault() && event.stopPropagation();

        if(event.deltaY > 0) {
            zoomChange(-1)
        } else {
            zoomChange(1)
        }
    }, { passive: false });

    document.getElementById('btn-zoom-decrease').addEventListener('click', function() {
        zoomChange(-1)
    });
    document.getElementById('btn-zoom-increase').addEventListener('click', function() {
        zoomChange(1)
    });

    if(hash) {
        updateNbLayers();
        setInterval(function() {
            updateNbLayers();
        }, 10000);
    }
};

var createSignaturePad = function() {
    signaturePad = new SignaturePad(document.getElementById('signature-pad'), {
        penColor: 'rgb(0, 0, 0)',
        minWidth: 1.25,
        maxWidth: 2,
        throttle: 0,
        onEnd: function() {
            const file = new File([dataURLtoBlob(signaturePad.toDataURL())], "draw.png", {
                type: 'image/png'
            });
            var data = new FormData();
            data.append('file', file);
            uploadSVG(data);
        }
    });
};

async function getPDFBlobFromCache(cacheUrl) {
    const cache = await caches.open('pdf');
    let responsePdf = await cache.match(cacheUrl);

    if(!responsePdf) {
        return null;
    }

    let pdfBlob = await responsePdf.blob();

    return pdfBlob;
}

async function uploadFromUrl(url) {
    history.replaceState({}, '', '/signature');
    var response = await fetch(url);
    if(response.status != 200) {
        return;
    }
    var pdfBlob = await response.blob();

    if(pdfBlob.type != 'application/pdf' && pdfBlob.type != 'application/octet-stream') {
        return;
    }
    let dataTransfer = new DataTransfer();
    let filename = url.replace(/^.*\//, '');
    dataTransfer.items.add(new File([pdfBlob], filename, {
        type: 'application/pdf'
    }));
    document.getElementById('input_pdf_upload').files = dataTransfer.files;
    document.getElementById('input_pdf_upload').dispatchEvent(new Event("change"));
}

var modalSharing = function() {
    if(window.location.hash == '#informations') {
        let modalInformationsEl = document.getElementById('modal-share-informations');
        let modalInformations = bootstrap.Modal.getOrCreateInstance(modalInformationsEl);
        modalInformations.show();
        modalInformationsEl.addEventListener('hidden.bs.modal', function (event) {
            if(window.location.hash) {
                history.pushState({}, '', window.location.href.replace(/#.*$/, ''));
            }
        })
    }

    if(window.location.hash == '#signed') {
        let modalSignedEl = document.getElementById('modal-signed');
        let modalSigned = bootstrap.Modal.getOrCreateInstance(modalSignedEl);
        modalSigned.show();
        modalSignedEl.addEventListener('hidden.bs.modal', function (event) {
            if(window.location.hash) {
                history.pushState({}, '', window.location.href.replace(/#.*$/, ''));
            }
        })
    }
}

var pageUpload = async function() {
    document.getElementById('input_pdf_upload').value = '';
    document.getElementById('page-upload').classList.remove('d-none');
    document.getElementById('page-signature').classList.add('d-none');
    document.getElementById('input_pdf_upload').focus();
    const cache = await caches.open('pdf');
    document.getElementById('input_pdf_upload').addEventListener('change', async function(event) {
        if(document.getElementById('input_pdf_upload').files[0].size > maxSize) {

            alert("Le PDF ne doit pas dépasser " + Math.round(maxSize/1024/1024) + " Mo");s
            document.getElementById('input_pdf_upload').value = "";
            return;
        }
        let filename = document.getElementById('input_pdf_upload').files[0].name;
        let response = new Response(document.getElementById('input_pdf_upload').files[0], { "status" : 200, "statusText" : "OK" });
        let urlPdf = '/pdf/'+filename;
        await cache.put(urlPdf, response);
        history.pushState({}, '', '/signature#'+filename);
        pageSignature(urlPdf)
    });
}

var updateNbLayers = function() {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/signature/'+hash+'/nblayers', true);
    xhr.onload = function() {
      if (xhr.status == 200) {
          let nblayers = xhr.response;
          document.querySelectorAll('.nblayers').forEach(function(item) {
            item.innerHTML = nblayers;
          });
          document.querySelector('#nblayers_text').classList.remove('d-none');
          if(!nblayers) {
              document.querySelector('#nblayers_text').classList.add('d-none');
          }
      }
    };
    xhr.send();
};

var pageSignature = async function(url) {
    modalSharing();
    document.getElementById('page-upload').classList.add('d-none');
    document.getElementById('page-signature').classList.remove('d-none');
    fabric.Textbox.prototype._wordJoiners = /[]/;
    menu = document.getElementById('sidebarTools');
    menuOffcanvas = new bootstrap.Offcanvas(menu);
    forceAddLock = !is_mobile();
    addLock = forceAddLock;

    if(localStorage.getItem('svgCollections')) {
        svgCollections = JSON.parse(localStorage.getItem('svgCollections'));
    }

    opentype.load('/vendor/fonts/Caveat-Regular.ttf', function(err, font) {
        fontCaveat = font;
    });

    let pdfBlob = null;
    let filename = url.replace('/pdf/', '');

    if(hash) {
        var response = await fetch(url);
        if(response.status != 200) {
            return;
        }
        pdfBlob = await response.blob();
        if(response.headers.get('Content-Disposition').match(/attachment; filename="/)) {
            filename = response.headers.get('Content-Disposition').replace(/^[^"]*"/, "").replace(/"[^"]*$/, "").replace(/_signe-[0-9]+\x.pdf/, '.pdf');
        }
    } else {
        pdfBlob = await getPDFBlobFromCache(url);
    }

    document.title = filename + ' - ' + document.title;

    if(!pdfBlob) {
        document.location = '/signature';
        return;
    }

    createSignaturePad();
    responsiveDisplay();
    displaysSVG();
    stateAddLock();
    createEventsListener();
    loadPDF(pdfBlob, filename);
};

(function () {
    if(hash) {
        pageSignature('/signature/'+hash+'/pdf');
        window.addEventListener('hashchange', function() {
            window.location.reload();
        })
        return;
    }

    if(window.location.hash && window.location.hash.match(/^\#http/)) {
        let hashUrl = window.location.hash.replace(/^\#/, '');
        pageUpload();
        uploadFromUrl(hashUrl);
    } else if(window.location.hash) {
        pageSignature('/pdf/'+window.location.hash.replace(/^\#/, ''));
    } else {
        pageUpload();
    }
    window.addEventListener('hashchange', function() {
        window.location.reload();
    })
})();