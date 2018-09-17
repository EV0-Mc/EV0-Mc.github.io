/* IE Console fix
 * source: http://stackoverflow.com/a/13817235/1232641
 */
(function(){
  if(!window.console){window.console={}}var e=["log","info","warn","error","debug","trace","dir","group","groupCollapsed","groupEnd","time","timeEnd","profile","profileEnd","dirxml","assert","count","markTimeline","timeStamp","clear"];for(var t=0;t<e.length;t++){if(!window.console[e[t]]){window.console[e[t]]=function(){}}}})();

(function($){
  
$.fn.styleit = function(options){
  
  // Default settings
  $.fn.styleit.defaults = {
    si_folder_path		: 'styleit',
    min_width         		: 1024, 
    presets           		: "default",
    disable_presets		: false,
    default_preset		: 'default',
    changeInputFont   		: true,
    tooltip_top_offset		: -28
  };

  opts = $.extend($.fn.styleit.defaults, options);
  
  opts.presets_ = opts.presets.split(",");
  
  console.group("StyleIt init()");
  console.time("All done");
  
  var
  body 		      = $('body'),
  head 		      = $('head'),
  html 		      = $('html');
  
  //main object
  _styleit = {
    
    //main functions
    on: function( eventName, fn ){
      
      if ( _styleit.core.events[eventName] ) {
        _styleit.core.events[eventName].push(fn);
      }
      else { console.error( "'" + eventName + "' is not a valid Styleit Event" ) }
      
    },
    
    off: function( eventName, fn ) {
      
      if (fn) {
        if ( eventName == "init" ) {
          //loop trhough all functions in the array
          for (var x = 0; x < _styleit.core.events.init.length; x++) {
            
            //find the target function
            if ( _styleit.core.events.init[x].toString() == fn.toString() ) {
              
              //remove target function from array
              _styleit.core.events.init.splice(x,1);
              
            }
            
          }
        }
      }
      
      else {
        if ( _styleit.core.events[eventName] ) {
          _styleit.core.events[eventName] = [];
        }
        else { console.error( "'" + eventName + "' is not a valid Styleit Event" ) }
      }
      
    },
    
    core: {
      
      init: function(){
        
        for (var fn in _styleit.core.events.init) {
          _styleit.core.events.init[fn]()
        }
        
      },
      
      //functions to run on certain events
      events: {
        init: [],
        save: [],
        reset: []
      },
      
      func: {
        
        rgb2hex: function (rgb) {
          rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
          if (rgb === null) {
            return 'transparent';
          }
          return "#" +
           ("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
           ("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
           ("0" + parseInt(rgb[3],10).toString(16)).slice(-2);
        },
        
	addFontLink: function(url){
	  if (!$('link[href="'+url+'"]').length) {
	    head.append('<link href="'+url+'" type="text/css" rel="stylesheet">')
	  }
	},
	
        getCSS: function( si_change ){
          var
          targetName,
          targetProp;
          
          for (var x in si_change) {
            targetName = (x.indexOf(',')) ? x.split(',')[0] : x;
            targetProp = (typeof si_change[x] == 'object') ? si_change[x][0] : si_change[x];
            break;
          }
          
          var ret = $(targetName).css(targetProp);
          
          if (ret.indexOf('rgb') >= 0) {
            ret = _styleit.core.func.rgb2hex(ret);
          }
          
          return ret;
        }
        
      },
      
    },
    
    data: {
      //Style object. previously known as si_style
      styledata: (si_restored) ? styleit_store.get('styledata') : {},
      template: {}
    },
    
    //accepts and object similar to the one in data-si-change attribute
    change: function( obj, arg ){
      
      for (var target_name in obj) {
        var
        target_property = obj[target_name],
        target = $(target_name),
        val    = (typeof arg == 'object') ? arg.value : arg;
        
        //create object if it doesn't exist
        if (!_styleit.data.styledata[target_name]) {
          _styleit.data.styledata[target_name] = {}
        }
	
        _styleit.data.styledata[target_name][target_property] = val;
        
        if (arg.fonturl) {
          _styleit.data.styledata[target_name]['_fonturl'] = arg.fonturl;
        }
        if (arg.meta) {
          for (var prop in arg.meta) {
            _styleit.data.styledata[target_name][prop] = arg.meta[prop];
            target.css(prop, arg.meta[prop]);
          }
        }
        
        target.css(target_property, val);
	
      }
      
    },
	
    
    //generates CSS everytime (slow, but no inline-style)
    change2: function( obj, arg ){
      
      for (var target_name in obj) {
        var
        target_property = obj[target_name],
        target = $(target_name),
        val    = (typeof arg == 'object') ? arg.value : arg;
        
        //create object if it doesn't exist
        if (!_styleit.data.styledata[target_name]) {
          _styleit.data.styledata[target_name] = {}
        }
	
        _styleit.data.styledata[target_name][target_property] = val;
        
        if (arg.fonturl) {
          _styleit.data.styledata[target_name]['_fonturl'] = arg.fonturl;
        }
        if (arg.meta) {
          for (var prop in arg.meta) {
            _styleit.data.styledata[target_name][prop] = arg.meta[prop];
            target.css(prop, arg.meta[prop]);
          }
        }
        
        var newcss = _styleit.buildCSS();
        if (siStyleTag[0].styleSheet) {
          siStyleTag[0].styleSheet.cssText = newcss;
        }
        else {
          siStyleTag.html(newcss);
        }
      }
      
    },
	  
    //builds CSS using _styleit.data.styledata
    //returns raw CSS
    buildCSS: function(){
      //css to return
      var css = "";
      
      //loop through every object inside styledata
      for (var x in _styleit.data.styledata) {
        
        //loop through object's child objects
        for (var p in _styleit.data.styledata[x]) {
          //append to CSS to be returned
          css += x + "{"+ p +":"+ _styleit.data.styledata[x][p] +"}"
        }
        
      }
      return css;
    },
    
    reset: function(){
      
      _styleit.resetElmStyle();
      
      si_restored = false;
      styleit_store.remove('styledata')
      styleit_store.remove('style')
      
      for (var fn in _styleit.core.events.reset) {
        _styleit.core.events.reset[fn]()
      }
      
    },
    
    resetElmStyle: function(){
      
      for (var elm in _styleit.data.styledata) {
        for (var prop in _styleit.data.styledata[elm]) {
          $(elm).css(prop,'')
        }
      }
      
    },
    
    save: function(css){
      
      styleit_store.set('style', css);
      styleit_store.set('styledata', _styleit.data.styledata);
      
      for (var fn in _styleit.core.events.save) {
        _styleit.core.events.save[fn]()
      }
      
    },
    
    preset: {
      change: function(name){
        _styleit.resetElmStyle();
        _styleit.data.styledata = {}
        _styleit.data.style =  "" 
        
        
        var
        stylebox = $('#styleit-wrapper');
        
        //load from storage
        if (name==styleit_store.get('preset') && _styleit.data.template[name] ) {
          stylebox.html(_styleit.data.template[name])

          //action links
          _styleit.ui.actionLinks();
          //position, drag-drop
          _styleit.ui.setup.stylebox.setup();
    //tooltips
          _styleit.ui.setup.stylebox.tooltips();
    
          //setup
          _styleit.ui.inputSetup();
          
          _styleit.save(_styleit.buildCSS());
          
          var presetChanger = $('#si-preset-changer');
    
    _styleit.ui.setup.stylebox.presetList();
    
          //preset changer setup
          presetChanger.children('.styleit-select-options').on('click',"span", function(){
            
            //reset current styledata
            si_restored = false;
            styleit_store.remove('styledata')
            styleit_store.remove('style')
            
            _styleit.preset.change($(this).data('si-value'))
            
          });
          var facevalue = presetChanger.find('span[data-si-value="'+name+'"]').text();
          presetChanger.find('.styleit-select-placeholder').text(facevalue)
          
          _styleit.save(_styleit.buildCSS())
        }
        
        //load from url
        else {
          
          var request = $.ajax({
            url: opts.si_folder_path+"/"+name+".si",
            async: true,
            dataType: "html"
          });
          
          request.done(function(msg){
            styleit_store.set('preset',name);
            
            //parse template
            //replace variables with their respective values
            var tpl = _styleit.preset.parseTemplate(msg);
            _styleit.data.template[name] = tpl;
            stylebox.html(tpl);
            console.log('styleit: preset "'+name+'.si" loaded!')

            //action links
            _styleit.ui.actionLinks();
            //position, drag-drop
            _styleit.ui.setup.stylebox.setup();
      //tooltips
            _styleit.ui.setup.stylebox.tooltips();
      
            //setup
            _styleit.ui.inputSetup();
            
            _styleit.save(_styleit.buildCSS());
            
            var presetChanger = $('#si-preset-changer');
      
      _styleit.ui.setup.stylebox.presetList();
      
            //preset changer setup
            presetChanger.children('.styleit-select-options').on('click',"span", function(){
              
              //reset current styledata
              si_restored = false;
              styleit_store.remove('styledata')
              styleit_store.remove('style')
              
              _styleit.preset.change($(this).data('si-value'))
              
            });
            var facevalue = presetChanger.find('span[data-si-value="'+name+'"]').text();
            presetChanger.find('.styleit-select-placeholder').text(facevalue)
            
            _styleit.save(_styleit.buildCSS())
          });
          
          //log fail message
          request.fail(function( jqXHR, textStatus ) {
            console.log('styleit: Could not load "'+opts.si_folder_path+"/"+name+".si"+'" | '+ textStatus +'');
          });
          
        }
      },
      
      load: function(name){
        
        var
        stylebox = $('#styleit-wrapper');
        
        //load from storage
        if (name==styleit_store.get('preset') && _styleit.data.template[name] ) {
          stylebox.html(_styleit.data.template[name])

          //action links
          _styleit.ui.actionLinks();
          //position, drag-drop
          _styleit.ui.setup.stylebox.setup();
			//tooltips
          _styleit.ui.setup.stylebox.tooltips();
          
          var presetChanger = $('#si-preset-changer');
    
		_styleit.ui.setup.stylebox.presetList();
    
          //preset changer setup
          presetChanger.children('.styleit-select-options').on('click',"span", function(){
      
            //reset current styledata
            si_restored = false;
            styleit_store.remove('styledata')
            styleit_store.remove('style')
            
            _styleit.preset.change($(this).data('si-value'))
            
          });
          var facevalue = presetChanger.find('span[data-si-value="'+name+'"]').text();
          presetChanger.find('.styleit-select-placeholder').text(facevalue)
    
    //setup
          _styleit.ui.inputSetup();
        }
        
        //load from url
        else {
          
          var request = $.ajax({
            url: opts.si_folder_path+"/"+name+".si",
            async: true,
            dataType: "html"
          });
          
          request.done(function(msg){
            styleit_store.set('preset',name);
            
            //parse template
            //replace variables with their respective values
            var tpl = _styleit.preset.parseTemplate(msg);
            _styleit.data.template[name] = tpl;
            stylebox.html(tpl);
            console.log('styleit: preset "'+name+'.si" loaded!')

            //action links
            _styleit.ui.actionLinks();
            //position, drag-drop
            _styleit.ui.setup.stylebox.setup();
			//tooltips
            _styleit.ui.setup.stylebox.tooltips();
            
            var presetChanger = $('#si-preset-changer');
      
			_styleit.ui.setup.stylebox.presetList();
      
            //preset changer setup
            presetChanger.children('.styleit-select-options').on('click',"span", function(){
        
              //reset current styledata
              si_restored = false;
              styleit_store.remove('styledata')
              styleit_store.remove('style')
              
              _styleit.preset.change($(this).data('si-value'))
              
            });
            var facevalue = presetChanger.find('span[data-si-value="'+name+'"]').text();
            presetChanger.find('.styleit-select-placeholder').text(facevalue)
      
      //setup
            _styleit.ui.inputSetup();
          });
          
          //log fail message
          request.fail(function( jqXHR, textStatus ) {
            console.log('styleit: Could not load "'+opts.si_folder_path+"/"+name+".si"+'" | '+ textStatus +'');
          });
          
        }
        
      },
      
	  exportCurrent: function(filename){
		var _siNewPreset = $('<div />');
		_siNewPreset.html($('#styleit-wrapper').html());
		_siNewPreset.find('[data-si-type]').each(function(){
			var $this=$(this),
			type=$this.data('si-type');
			
			if(type=='select'){
				var currentNode = $this.find('.styleit-select-options').find('*:contains('+$this.find('.styleit-select-placeholder').text()+')');
				if(currentNode){
					var val=currentNode.data('si-value'), 
					fonturl=currentNode.data('si-fonturl');
					
					$this.attr('data-si-value',val);
					
					if(fonturl){$this.attr('data-si-fonturl',fonturl)}
				}
			}
			
			else if(type=='color'){
				$this.attr('data-si-value',$this.css('background-color'))
			}
			
			else if(type=='background-image'){
				$this.attr('data-si-value',$this.css('background-image').slice(4, -1).replace(/"/g, "").replace(XenForo.baseUrl(), ''))
			}
		});
		
		
		/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */
		var saveAs=saveAs||function(e){"use strict";if(typeof navigator!=="undefined"&&/MSIE [1-9]\./.test(navigator.userAgent)){return}var t=e.document,n=function(){return e.URL||e.webkitURL||e},r=t.createElementNS("http://www.w3.org/1999/xhtml","a"),i="download"in r,o=function(e){var t=new MouseEvent("click");e.dispatchEvent(t)},a=/Version\/[\d\.]+.*Safari/.test(navigator.userAgent),f=e.webkitRequestFileSystem,u=e.requestFileSystem||f||e.mozRequestFileSystem,s=function(t){(e.setImmediate||e.setTimeout)(function(){throw t},0)},c="application/octet-stream",d=0,l=500,w=function(t){var r=function(){if(typeof t==="string"){n().revokeObjectURL(t)}else{t.remove()}};if(e.chrome){r()}else{setTimeout(r,l)}},p=function(e,t,n){t=[].concat(t);var r=t.length;while(r--){var i=e["on"+t[r]];if(typeof i==="function"){try{i.call(e,n||e)}catch(o){s(o)}}}},v=function(e){if(/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(e.type)){return new Blob(["\ufeff",e],{type:e.type})}return e},y=function(t,s,l){if(!l){t=v(t)}var y=this,m=t.type,S=false,h,R,O=function(){p(y,"writestart progress write writeend".split(" "))},g=function(){if(R&&a&&typeof FileReader!=="undefined"){var r=new FileReader;r.onloadend=function(){var e=r.result;R.location.href="data:attachment/file"+e.slice(e.search(/[,;]/));y.readyState=y.DONE;O()};r.readAsDataURL(t);y.readyState=y.INIT;return}if(S||!h){h=n().createObjectURL(t)}if(R){R.location.href=h}else{var i=e.open(h,"_blank");if(i==undefined&&a){e.location.href=h}}y.readyState=y.DONE;O();w(h)},b=function(e){return function(){if(y.readyState!==y.DONE){return e.apply(this,arguments)}}},E={create:true,exclusive:false},N;y.readyState=y.INIT;if(!s){s="download"}if(i){h=n().createObjectURL(t);r.href=h;r.download=s;setTimeout(function(){o(r);O();w(h);y.readyState=y.DONE});return}if(e.chrome&&m&&m!==c){N=t.slice||t.webkitSlice;t=N.call(t,0,t.size,c);S=true}if(f&&s!=="download"){s+=".download"}if(m===c||f){R=e}if(!u){g();return}d+=t.size;u(e.TEMPORARY,d,b(function(e){e.root.getDirectory("saved",E,b(function(e){var n=function(){e.getFile(s,E,b(function(e){e.createWriter(b(function(n){n.onwriteend=function(t){R.location.href=e.toURL();y.readyState=y.DONE;p(y,"writeend",t);w(e)};n.onerror=function(){var e=n.error;if(e.code!==e.ABORT_ERR){g()}};"writestart progress write abort".split(" ").forEach(function(e){n["on"+e]=y["on"+e]});n.write(t);y.abort=function(){n.abort();y.readyState=y.DONE};y.readyState=y.WRITING}),g)}),g)};e.getFile(s,{create:false},b(function(e){e.remove();n()}),b(function(e){if(e.code===e.NOT_FOUND_ERR){n()}else{g()}}))}),g)}),g)},m=y.prototype,S=function(e,t,n){return new y(e,t,n)};if(typeof navigator!=="undefined"&&navigator.msSaveOrOpenBlob){return function(e,t,n){if(!n){e=v(e)}return navigator.msSaveOrOpenBlob(e,t||"download")}}m.abort=function(){var e=this;e.readyState=e.DONE;p(e,"abort")};m.readyState=m.INIT=0;m.WRITING=1;m.DONE=2;m.error=m.onwritestart=m.onprogress=m.onwrite=m.onabort=m.onerror=m.onwriteend=null;return S}(typeof self!=="undefined"&&self||typeof window!=="undefined"&&window||this.content);if(typeof module!=="undefined"&&module.exports){module.exports.saveAs=saveAs}else if(typeof define!=="undefined"&&define!==null&&define.amd!=null){define([],function(){return saveAs})};
		
		var _siNewPresetFileName = prompt('Enter preset name');
		
			if(_siNewPresetFileName && _siNewPresetFileName.length){
				try {
					_siNewPreset.find('#si-preset-changer .styleit-select-options').html('');
					var mapObj = {"'":'"','"':"'",'&quot;': '"'};
					var _siNewPresetData = _siNewPreset.html().replace(/'|"|&quot;/gi, function(matched){return mapObj[matched]});
					saveAs(new Blob([_siNewPresetData], {type: "text/html;charset=utf-8"}), _siNewPresetFileName+'.si');
					_styleit.ui.messageFlash('Successfully exported!', '#5FBD2A', 1500)
				} catch(e){
					_styleit.ui.messageFlash('Something went wrong', '#BD2A2A', 1500);
					console.error(e);
				}
				
			} 
			else {
				_styleit.ui.messageFlash('please enter a file name!', '#BD2A2A', 1500)
			}
	  },
	  
      parseTemplate: function( msg ){
        var ret = msg;
        for (var variable in styleit_var) {
          var str = "{%"+ variable +"%}";
          if (msg.indexOf(str)) {
            var pattern = new RegExp(str, "g")
            ret = ret.replace(pattern, styleit_var[variable])
          }
        }
        return ret;
      }
      
    },
    
    //setup the UI
    ui: {
      
      setup: {
        
        stylebox: {
	  tooltips: function(){
	    //append tooltip container
	    if (!$('#si-tooltip-container').length) {
	      body.append("<span id='si-tooltip-container'></span>");
	    }
	    var tooltip_container = $('#si-tooltip-container');
	    
	    $('[data-si-tooltip]').on('mouseenter', function(){
	      var
	      _this 	= $(this),
	      elmWidth	= _this.outerWidth(),
	      ttip	= _this.data('si-tooltip'),
	      pos	= _this.offset();
	      
	      tooltip_container.show().text(ttip).css({
		left: pos.left,
		top: pos.top + opts.tooltip_top_offset
	      });
	      
	      var
	      tooltip_width = tooltip_container.outerWidth();
	      
	      tooltip_container.css({
		left: ( pos.left - tooltip_width/2 ) + elmWidth/2
		})
	      
	    })
	    $('[data-si-tooltip]').on('mouseleave', function(){
	      tooltip_container.hide();
	    })
	  },
          presetList: function(){
	    var presetChangerOptions = $('#si-preset-changer').find('.styleit-select-options');
	    if (!presetChangerOptions.children().length) {
	      for (var x=0;x<opts.presets_.length;x++) {
		presetChangerOptions.append("<span data-si-value='"+opts.presets_[x]+"'>"+opts.presets_[x]+"</span>");
	      }
	    }
	    
	    //hide presetChanger
	    if (opts.disable_presets || $('#si-preset-changer').find('.styleit-select-options').children().length <= 1) {
	      $('#si-preset-changer').remove();
	    }
	    
	  },
	  
          setup: function(){
            var stylebox = $("#styleit-wrapper");
	    
            //restore position
            if(styleit_store.get('stylebox-position')){
              var pos = styleit_store.get('stylebox-position');
              $("#styleit-wrapper").css({
                top: pos.top,
                left: pos.left
              });
            }
	    else {
	      //centerize
	      stylebox.offset({
		left: $(window).width()/2 - stylebox.outerWidth()/2,
		top: $(window).height()/2 - stylebox.outerHeight()/2 + $(window).scrollTop()
	      });
	    }
            
            //drag-drop
            var being_dragged = false;
            $("#si-move").off('mousedown.sidrgdrp').on('mousedown.sidrgdrp', function(e){
                _styleit.ui.setup.stylebox.drag.start(e);
                being_dragged = true;
                return false;
            });
                
            $(document).off('mouseup.sidrgdrp').on('mouseup.sidrgdrp', function(){
                if(being_dragged){
                  _styleit.ui.setup.stylebox.drag.stop();
                  being_dragged = false;
                }
            });
            
            //fix position on resize
            $(window).resize(function(){
              _styleit.ui.setup.stylebox.drag.stop();
            });
            
          },
          
          drag: {
            start: function(e){
              var
              stylebox    = $("#styleit-wrapper"),
              boxPOS			= stylebox.offset(),
              scrollTop		= $(window).scrollTop(),
              mouseXFromBoxEdge 	= Math.round(e.pageX-boxPOS.left),
              mouseYFromBoxEdge	  = Math.round(e.pageY-((boxPOS.top-scrollTop)));
              
              $(document).on('mousemove.sidrgdrp', function(e){
                stylebox.css({
                  top: e.pageY - (mouseYFromBoxEdge),
                  left: e.pageX - mouseXFromBoxEdge
                });
                e.preventDefault();
              });
              
              stylebox.addClass('being-dragged');
              
            },
            stop: function(e){
              $(document).off('mousemove.sidrgdrp')
              
              var
              stylebox    = $("#styleit-wrapper"),
              win         = $(window),
              winHeight   = win.height(),
              winWidth    = win.width(),
              boxPOS			= stylebox.offset(),
              scrollTop		= $(window).scrollTop(),
              fromtop     = boxPOS.top - scrollTop,
              frombottom  = winHeight - ( fromtop + stylebox.outerHeight() ),
              fromright   = winWidth - ( boxPOS.left + stylebox.outerWidth() ),
              fromleft    = boxPOS.left;
              
              if ( fromtop<0 || fromleft<0 ) {
                fromtop = (fromtop<0) ? 0 : fromtop;
                fromleft = (fromleft<0) ? 0 : fromleft;
              }
              if ( frombottom<0 || fromright<0 ) {
                fromtop = (frombottom<0) ? winHeight - stylebox.outerHeight() : fromtop;
                fromleft = (fromright<0) ? winWidth - stylebox.outerWidth() : fromleft;
              }
              
              if(jQuery.easing["jswing"]){
                stylebox.stop().animate({ 'top': fromtop, 'left': fromleft},
                  {
                    duration: 400,
                    easing: "easeInOutBack"
                  });
              }
              else {
                  stylebox.stop().animate({ 'top': fromtop, 'left': fromleft}, 200);
              } 	
              
              styleit_store.set('stylebox-position',{top:fromtop,left:fromleft});
              
              stylebox.removeClass('being-dragged');
            }
          }
        },
        
      },
      
      messageFlash: function( msg, color, duration ) {
        if (!$('#si-msgflash').length) {
          $('.styleit-footer').prepend('<span id="si-msgflash"></span>')
        }
        var
        spot = $('#si-msgflash'),
        dur = duration || 1000,
        col = color || '#888';
        
        spot.css('color',col).text(msg).stop().fadeIn();
        
        setTimeout(function(){
          spot.fadeOut();
        }, dur)
      },
      
      actionLinks: function(){
        
        var stylebox = $('#styleit-wrapper');
        
        //save button
        $('[data-si-action="save"]').on('click', function(e){
          _styleit.save(_styleit.buildCSS());
          console.log('styleit: saved!');
          e.preventDefault();
        })
		if(!$('#si-export').length){
			$('[data-si-action="save"]').before('<div class="styleit-action-icon right" id="si-export" onClick="_styleit.preset.exportCurrent()" data-si-action="export]"><i class="fa fa-upload"></i></div>')
		}
		
		if(!uix.user.isAdmin){$('#si-export').remove()}
		
        
        //reset button
        $('[data-si-action="reset"]').on('click', function(e){
          
          _styleit.reset();
          
          var currentPresetName = styleit_store.get('preset') || opts.default_preset;
          _styleit.preset.change(currentPresetName);
          console.log('styleit: reset!');
          e.preventDefault();
        });
		
      },
      
      inputSetup: function(){
        
        $('[data-si-type]').each(function(){
          
          var
          _this           = $(this),
          input_type      = _this.data('si-type'),
          si_change       = _this.data('si-change'),
          meta            = _this.data('si-meta'),
          val             = (_this.data('si-value')) ? _this.data('si-value') : _styleit.core.func.getCSS(si_change);
          
          //change value for background-image
          if (input_type == "background-image") {
            if (val == 'none' || val.length === 0) {
              val = '';
            } else {
              val = "url("+val+")"
            }
          }
          
          //restored saved value from storage
          if (si_restored) {
            for (var item in si_change) {
              var
              target_name 	= item,
              target_property 	= si_change[item];
              val = styleit_store.get('styledata')[target_name][target_property];
              _this.data('si-value', val ).css('background-color', val);
              break;
            }
          }
          
          //change style
          if (meta) {
            var arg = {}
            arg.value = val;
            arg.meta = meta;
            _styleit.change2(si_change, arg);  
          }
          else {
            _styleit.change2(si_change, val);  
          }
          
          //////////////////
          // Color inputs //
          //////////////////
          if (input_type == 'color') {
            _this.colpick({
              flat: true,
              layout:'hex',
              onChange:function(hsb,hex,rgb,fromSetColor) {
                _styleit.change(si_change, '#'+hex);
                _this.css('background-color', '#'+hex)
              }
            });
	    //convert rgb value to hex
	    var newcolor = val;
	    if (val.indexOf('rgb(') == 0) {
	      newcolor = _styleit.core.func.rgb2hex(val);
	    }
	    //if hex
	    else if (val.indexOf('#') == 0) {
	      //if triplet
	      if (val.length ==4) {
		newcolor = val[1] + val[1] + val[2] + val[2] + val[3] + val[3];
	      }
	    }
            _this.colpickSetColor(newcolor);
	    
	    //remove inline style from targets
	    for (var tar in si_change) {
	      $(tar).css(si_change[tar],'')
	    }
            
            _this.children('.colpick').hide();
            _this.removeClass('inactive')
          }
          
          else if (input_type == 'select') {
            var
	    current = _this.children('.styleit-select-options').find('[data-si-value="'+val+'"]');
            face_value = current.text();
            _this.children('.styleit-select-placeholder').text(face_value);
            
            var fontInput = false;
            
            for (var tar in si_change) {
              if (si_change[tar] == "font-family") {
                fontInput = true;
              }
              break;
            }
            
            if (fontInput && opts.changeInputFont) {
              _this.children('.styleit-select-placeholder').css('font-family',val)
	      
	      var arg = {},
	      fonturl = current.data('si-fonturl');
	      
	      if (fonturl) {
		//add fontlink
		_styleit.core.func.addFontLink(fonturl);
		
		arg.value = val;
		arg.fonturl = fonturl;
		_styleit.change2(si_change, arg);
	      }
	      
            }
          }
          
          else if (input_type == 'background-image') {
            
            _this.css('background-image',val)
            
            _this.find('.styleit-bgimage-options').children('span').each(function(){
              var _this = $(this);
              _this.css('background-image', 'url('+_this.data('si-value')+')')
            });
            
          }
          
        });
        
        //select dropdown
        $('.styleit-select').on('mousedown', function(e){
          
          var
	  _this = $(this);
	  
	  //check input type
          var fontInput = false,
	  si_change = _this.data('si-change');
          for (var tar in si_change) {
            if (si_change[tar] == "font-family" || si_change[tar] == "font") {
              fontInput = true;
            }
            break;
          }
          
	  if (fontInput) {
	    _this.find('.styleit-select-options').children().each(function(){
	      var
	      _this = $(this),
	      fUrl = _this.data('si-fonturl');
	      if (fUrl) {
		_styleit.core.func.addFontLink(fUrl);
	      }
	    })
	  }
          
          //hide other select dropdowns
          $('.styleit-select.active').each(function(e){
            if ($(this)[0] != _this[0]) {
              $(this).removeClass('active');
            }
          });
          
          if (!$(e.target).hasClass('.styleit-select-options') && !$(e.target).parents('.styleit-select-options').length) {
            _this.toggleClass('active');
          }
          
        });
        
        $('.styleit-select-options > span').on('click', function(){
          $(this).parents('.styleit-select').removeClass('active');
        });
        
        $('[data-si-type="select"] .styleit-select-options > span').on('click', function(){
          var
          _this         = $(this),
          parent        = _this.parents('.styleit-select'),
          si_change     = parent.data('si-change'),
          value         = _this.data('si-value'),
          fonturl       = _this.data('si-fonturl'),
          face_value    = _this.text();
          
          parent.children('.styleit-select-placeholder').text(face_value)
          if (opts.changeInputFont) {
            parent.children('.styleit-select-placeholder').css('font-family',value);
          }
          
          //add entry for fontURL
          if (fonturl) {
            //add fontlink
	    _styleit.core.func.addFontLink(fonturl);
	    
            var arg = {};
            arg.value = value;
            arg.fonturl = fonturl;
            _styleit.change(si_change, arg);
          }
          else {
            _styleit.change(si_change, value);
          }
          
        });
        
        $('[data-si-type="color"]').on('click', function(e){
          
          var _this = $(this);
          
          $('[data-si-type="color"].active').each(function(){
            if(!$(this).is(_this)){
              $(this).removeClass('active').find('.colpick').hide();
            }
          })
          
          if (!_this.hasClass('active')) {
            _this.addClass('active').children('.colpick').show();
          }
          else if ($(e.target) != _this.children('.colpick') && !$(e.target).parents('[data-si-type="color"]').length ) {
            _this.removeClass('active').children('.colpick').hide();
          }
          
        });
        
        $('[data-si-type="background-image"]').on('click', function(e){
          var options = $(this).children('.styleit-bgimage-options')
          if (e.target != options[0] && !$(e.target).parents('.styleit-bgimage-options').length) {
            $(this).toggleClass('active');
          }
        });
        
        $('.styleit-bgimage-options > span').on('click', function(e){
          var
          _this = $(this),
          parent = _this.parents('[data-si-type="background-image"]')
          change = parent.data('si-change'),
          meta = _this.data('si-meta'),
          val = "url("+ _this.data('si-value') + ")";
          if (meta) {
            var arg = {};
            arg.value = val;
            arg.meta = meta;
            _styleit.change(change, arg);
          }
          else {
            _styleit.change(change, val);
          }
          parent.css('background-image',val)
          
        });
        
        $(document).on('click', function(e){
          if ($(e.target).attr('data-si-type') != "color" && !$(e.target).parents('[data-si-type="color"]').length ) {
            var actives = $('[data-si-type="color"].active');
            actives.removeClass('active').find('.colpick').hide();
          }
          if (!$(e.target).hasClass('styleit-select') && !$(e.target).parents('.styleit-select').length) {
            $('.styleit-select.active').removeClass('active')
          }
          if ($(e.target).attr('data-si-type') != 'background-image' && !$(e.target).parents('[data-si-type="background-image"]').length) {
            $('[data-si-type="background-image"].active').removeClass('active');  
          }
        })
        
        $('.colpick_submit').on('mousedown', function(){
          $(this).parents('[data-si-type="color"]').removeClass('active').children('.colpick').hide();
        });
        
      }
      
    }
  }
  
  //shorthand for _styleit
  if (typeof $i== 'undefined') {
    $i = _styleit;
  }
  else {
    console.warn('$i already defined. Access styleit object using _styleit')
  }
  
  _styleit.on('init', function(){
    
    
    var es = body[0].style;
    if (es.WebkitTransform == '') {
      html.addClass('css3Transform');
    }
    
    //add si-style <style> tag
    //holds the CSS
    if ( !$("#si-style").length ) {
      head.append("<style type='text/css' id='si-style'></style>");
    }
    siStyleTag = $('#si-style');
    console.log('#si-style added to head');
    
    //add styleit-wrapper
    if ( !$("#styleit-wrapper").length ) {
      body.append("<div id='styleit-wrapper'></div>");
      console.log('#styleit-wrapper not found, appending to body')
    }
    //restore stylebox state
    if(styleit_store.get('stylebox-state') == 'visible') {
      $("#styleit-wrapper").addClass('visible')
    }
    
    //load preset
    var presetName = styleit_store.get('preset') || opts.default_preset;
    _styleit.preset.load(presetName);
    
    var stylebox = $('#styleit-wrapper');
        
        //setup styleit box
        $('body').on('click', '.si-reveal-toggle', function(){
          stylebox.toggleClass('visible');
          if (stylebox.hasClass('visible')) {
	    styleit_store.set('stylebox-state','visible')
          }
          else {
            styleit_store.set('stylebox-state','hidden')
          }
	  return false;
        });
	
    //fix pos
    _styleit.ui.setup.stylebox.drag.stop();
  });
  
  _styleit.on('save', function(){
    _styleit.ui.messageFlash('Style saved!', '#5FBD2A', 1500)
  });
  
  _styleit.on('reset', function(){
    _styleit.ui.messageFlash('Style reset to default!', '#5FBD2A', 1500);
  });
  
  if ($(window).width() >= opts.min_width) {
    //verify version
    if (!styleit_store.get('styleit-version')){
      styleit_store.set('styleit-version',styleit_id)
    }
    
    if (styleit_store.get('styleit-version') == styleit_id) {
      _styleit.core.init();
    }
    else {
      styleit_store.remove();
      si_restored = false;
      styleit_store.set('styleit-version',styleit_id)
      _styleit.core.init();
    }
    
  }
  else {
    console.error('styleit not initiated! Screen size smaller than min width: '+opts.min_width)
  }
  
  console.groupEnd("StyleIt init()");
  
}

})(jQuery);