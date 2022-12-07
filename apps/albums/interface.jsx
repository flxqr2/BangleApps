const { useRef, useState, useMemo, useEffect, useCallback, memo } = React;

const bpps = {
  1: '1bit',
  2: '2bitbw',
  3: '3bit',
  4: '4bitmac',
  8: 'web',
  16: 'rgb565',
};

const diffusions = {
  none: 'Nearest color (flat)',
  random1: 'Random small',
  random2: 'Random large',
  error: 'Error Diffusion',
  errorrandom: 'Randomised Error Diffusion',
  bayer2: '2x2 Bayer',
  bayer4: '4x4 Bayer',
};

const uid = () => {
  const ff = (s) => {
    const pt = (Math.random().toString(16) + '000000000').substr(2, 8);
    return s ? '-' + pt.substr(0, 4) + '-' + pt.substr(4, 4) : pt;
  };
  return ff() + ff(true) + ff(true) + ff();
};

const ViewOnBangleButton = memo(({ data, ...props }) => {
  const onClick = useCallback(() => {
    UART.eval('load(null)', () => {});
    UART.eval(
      `g.setColor(0x000000).setBgColor(0xFFFFFF).clear().drawImage(require("heatshrink").decompress(atob("${data}")));`,
      () => {}
    );
  }, [data]);
  return (
    <button className="button-full" onClick={onClick} {...props}>
      View on Bangle
    </button>
  );
});

const useFormField = ({ initial, key, onChange }) => {
  const [value, setValue] = useState(initial);
  const onChangeField = useCallback(
    (evt) => {
      setValue(evt.target.value);
    },
    [setValue]
  );

  useEffect(() => {
    onChange(key, value);
  }, [onChange, key, value]);

  return {
    name: key,
    value,
    onChange: onChangeField,
  };
};

const UploadField = ({ onAddImage }) => {
  const ref = useRef();
  const onChange = useCallback(
    (evt) => {
      const files = ref.current.files;
      for (const file of files) {
        if (file.type.indexOf('image/') === 0) {
          onAddImage(file);
        }
      }
    },
    [ref, onAddImage]
  );
  return <input ref={ref} type="file" onChange={onChange} />;
};

const DropZone = ({ onAddImage }) => {
  const onDragOver = useCallback((evt) => {
    evt.preventDefault();
  }, []);

  const onDrop = useCallback(
    (evt) => {
      evt.preventDefault();
      const files = (
        evt.dataTransfer.items
          ? [...evt.dataTransfer.items].map((item) =>
              item.kind === 'file' ? item.getAsFile() : null
            )
          : [...evt.dataTransfer.files]
      ).filter((it) => !!it && it.type.indexOf('image') === 0);
      files.forEach((file) => onAddImage(file));
    },
    [onAddImage]
  );

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{ height: '4rem', background: '#9b4dca', borderRadius: '1rem' }}
    >
      Drop Image Files
    </div>
  );
};

const SvgFile = ({ file }) => {
  const [svg, setSvg] = useState();

  useEffect(() => {
    file.text().then(setSvg);
  }, [file, setSvg]);

  // convert a svg's paths to animatable vectors
  const positions = useMemo(() => {
    if (!svg) return [];

    const div = document.createElement('div');
    div.innerHTML = svg;

    const positions = [];
    div.querySelectorAll('path').forEach((node) => {
      const pos = [];

      const len = node.getTotalLength();
      for (let i = 0; i < len; i += 4) {
        const p = node.getPointAtLength(i);

        if (
          i === 0 ||
          i === len - 1 ||
          Math.abs(
            Math.sqrt(
              Math.pow(Math.abs(p.x - pos[pos.length - 1][0]), 2),
              Math.pow(Math.abs(p.y - pos[pos.length - 1][1]), 2)
            )
          ) > 1.0
        ) {
          pos.push([Math.round(p.x), Math.round(p.y)]);
        }
      }
      positions.push(pos);
    });
    return positions;
  }, [svg]);

  return <Code>{JSON.stringify(positions)}</Code>;
};

const Code = (props) => (
  <pre>
    <code className="code-content" {...props} />
  </pre>
);

const ImageSettings = memo(({ onChange }) => {
  const contrast = useFormField({ initial: 0, key: 'contrast', onChange });
  const brightness = useFormField({ initial: 0, key: 'brightness', onChange });
  const mode = useFormField({
    initial: bpps[1],
    key: 'mode',
    onChange,
  });
  const diffusion = useFormField({
    initial: diffusions.none,
    key: 'diffusion',
    onChange,
  });

  return (
    <form>
      <label htmlFor="inp-contrast">Contrast</label>
      <input
        id="inp-contrast"
        {...contrast}
        type="range"
        min="-255"
        max="255"
        step="0.001"
      />
      <label htmlFor="inp-brightness">Brightness</label>
      <input
        id="inp-brightness"
        {...brightness}
        type="range"
        min="-255"
        max="255"
        step="0.001"
      />
      <label htmlFor="inp-mode">Mode</label>
      <select id="inp-mode" {...mode}>
        {Object.keys(bpps).map((k) => (
          <option key={k}>{bpps[k]}</option>
        ))}
      </select>
      <label htmlFor="inp-diffusion">Diffusion</label>
      <select id="inp-diffusion" {...diffusion}>
        {Object.keys(diffusions).map((k) => (
          <option key={k} value={k}>
            {diffusions[k]}
          </option>
        ))}
      </select>
    </form>
  );
});

const ImageFile = ({ file, onAddToAlbum, removeImage }) => {
  const img = useRef();
  const canvas = useRef();

  const [data, setData] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState({
    compression: true,
    updateCanvas: true,
    output: 'raw',
  });
  const src = useMemo(() => URL.createObjectURL(file), [file]);

  const onChangeSettings = useCallback(
    (key, val) => {
      setSettings((settings) => ({ ...settings, [key]: val }));
    },
    [setSettings]
  );

  useEffect(() => {
    if (!loaded) return;
    const ctx = canvas.current.getContext('2d');

    var hRatio = canvas.current.width / img.current.width;
    var vRatio = canvas.current.height / img.current.height;
    var ratio = Math.min(hRatio, vRatio);
    var centerShift_x = (canvas.current.width - img.current.width * ratio) / 2;
    var centerShift_y =
      (canvas.current.height - img.current.height * ratio) / 2;
    ctx.clearRect(0, 0, canvas.current.width, canvas.current.height);
    ctx.drawImage(
      img.current,
      0,
      0,
      img.current.width,
      img.current.height,
      centerShift_x,
      centerShift_y,
      img.current.width * ratio,
      img.current.height * ratio
    );

    setData(btoa(imageconverter.canvastoString(canvas.current, settings)));
  }, [setData, canvas, img, file, settings, loaded]);

  return (
    <article>
      <h1 style={{ margin: 0, fontSize: '100%' }}>{file.name}</h1>
      <div className="row">
        <div>
          <img
            src={src}
            ref={img}
            onLoad={() => setLoaded(true)}
            style={{ width: '176px', height: 'auto' }}
          />
        </div>
        <ImageSettings onChange={onChangeSettings} />
        <div>
          <canvas ref={canvas} width={176} height={176} />
        </div>
      </div>
      {!!data && (
        <div className="row">
          <Code>{data}</Code>
          <div>
            {data.length} bytes
            <br />
            <ViewOnBangleButton data={data} />
            <br />
            <button
              onClick={() => {
                onAddToAlbum({ name: file.name, data });
                removeImage(file);
              }}
            >
              Add to album
            </button>
          </div>
        </div>
      )}
    </article>
  );
};

const ListEntry = ({ file, onAddToAlbum, removeImage }) => {
  const isSvg = useMemo(() => file.type === 'image/svg+xml', [file.type]);
  return isSvg ? (
    <SvgFile file={file} />
  ) : (
    <ImageFile
      file={file}
      onAddToAlbum={onAddToAlbum}
      removeImage={removeImage}
    />
  );
};

const BangleConnect = ({ albums, setAlbums, setCurrentAlbum }) => {
  const [storageStats, setStorageStats] = useState();

  const { jsonFile, dataFile } = useMemo(() => {
    let dataStr = '';
    const jsonData = albums.map((album) => {
      return {
        ...album,
        images: album.images.map((image) => {
          const offset = dataStr.length;
          dataStr += image.data;
          return {
            name: image.name,
            offset,
            length: image.data.length,
          };
        }),
      };
    });

    return {
      jsonFile: JSON.stringify(jsonData),
      dataFile: dataStr,
    };
  }, [albums]);

  return (
    <section className="container">
      <div className="row">
        <h1 className="column column-75">Bangle</h1>
        <div className="column column-25">
          <button
            className="float-right"
            onClick={() => {
              UART.eval(
                'require("Storage").readJSON("albums.json.data")',
                (albums) => {
                  UART.eval(
                    'require("Storage").read("albums.data")',
                    (data) => {
                      if (data) {
                        setAlbums(
                          albums.map((album) => {
                            return {
                              ...album,
                              images: album.images.map((image) => ({
                                ...image,
                                data: data.substring(
                                  image.offset,
                                  image.offset + image.length
                                ),
                              })),
                            };
                          })
                        );
                        setCurrentAlbum(album.id);
                      }
                      UART.eval('require("Storage").getStats()', (data) => {
                        setStorageStats(data);
                      });
                    }
                  );
                }
              );
            }}
          >
            Connect
          </button>
        </div>
      </div>
      {!!storageStats && (
        <div
          style={{ display: 'flex', background: 'red', height: '2px' }}
          title={`free space: ${
            (100 / storageStats.totalBytes) * storageStats.freeBytes
          }%`}
        >
          <div
            style={{
              flex: `0 0 ${
                (100 / storageStats.totalBytes) * storageStats.freeBytes
              }%`,
              background: 'green',
              marginLeft: 'auto',
            }}
          />
        </div>
      )}
      <div>File contents: </div>
      <Code>{jsonFile}</Code>
      <Code>{dataFile}</Code>
      <button
        style={{ marginLeft: 'auto', display: 'block' }}
        onClick={() => {
          UART.eval(
            `require("Storage").write("albums.json.data",'${jsonFile}');`,
            (data) => {
              UART.eval(
                `require('Storage').write('albums.data', '${dataFile}')`,
                (data) => {
                  console.log('done');
                }
              );
            }
          );
        }}
      >
        Upload
      </button>
      <div className="clear" />
    </section>
  );
};

const AlbumImage = ({ data, name, removeFromAlbum }) => {
  const [url, setUrl] = useState(null);

  // let's convert our compressed espruino image to an url resource
  useEffect(() => {
    const buffer = new Uint8Array(
      atob(data)
        .split('')
        .map((c) => c.charCodeAt(0))
    );
    const rawData = heatshrink.decompress(buffer);
    let str = '';
    for (let n = 0; n < rawData.length; n++)
      str += String.fromCharCode(rawData[n]);
    const url = imageconverter.stringToImageURL(str);
    setUrl(url);
  }, [data, setUrl]);

  return (
    <div className="row" style={{ margin: '.4em 0' }}>
      <img src={url} />
      <div style={{ marginLeft: 'auto' }}>
        <ViewOnBangleButton data={data} />

        <button
          className="button-full"
          onClick={() => {
            removeFromAlbum({ name });
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
};
const Album = ({ setAlbums, removeFromAlbum, id, name, images }) => {
  const ref = useRef();
  useEffect(() => {
    if (name === 'new') {
      ref.current.focus();
      ref.current.select();
    }
  }, [id, ref, name]);

  return (
    <section className="container">
      <label htmlFor="input_name">Name</label>
      <input
        ref={ref}
        id="input_name"
        value={name}
        onChange={(evt) => {
          setAlbums((albums) =>
            albums.map((a) =>
              a.id === id ? { ...a, name: evt.target.value } : { ...a }
            )
          );
        }}
      />
      {images.map((image) => (
        <AlbumImage
          key={image.name}
          data={image.data}
          name={image.name}
          removeFromAlbum={removeFromAlbum}
        />
      ))}
    </section>
  );
};

const Main = () => {
  const [images, setImages] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [currentAlbum, setCurrentAlbum] = useState();

  const addImage = useCallback(
    (image) => {
      setImages((images) => [
        ...images.filter((i) => i.name !== image.name),
        image,
      ]);
    },
    [setImages]
  );

  const removeImage = useCallback(
    (image) => {
      setImages((images) => [...images.filter((i) => i.name !== image.name)]);
    },
    [setImages]
  );

  const onAddToAlbum = useCallback(
    ({ name, data }) => {
      setAlbums((prev) =>
        prev.map((album) =>
          album.id === currentAlbum
            ? { ...album, images: [...album.images, { name, data }] }
            : album
        )
      );
    },
    [currentAlbum, setAlbums, setImages]
  );

  const removeFromAlbum = useCallback(
    ({ name }) => {
      setAlbums((prev) =>
        prev.map((album) =>
          album.id === currentAlbum
            ? {
                ...album,
                images: [...album.images.filter((img) => img.name !== name)],
              }
            : album
        )
      );
    },
    [currentAlbum, setAlbums, setImages]
  );

  return (
    <main>
      <BangleConnect
        setAlbums={setAlbums}
        setCurrentAlbum={setCurrentAlbum}
        albums={albums}
      />

      <div className="container">
        <h2>Albums</h2>
        <nav style={{ display: 'flex', overflow: 'auto' }}>
          {albums.map(({ id, name }) => (
            <button
              style={{ margin: '.2em' }}
              key={id}
              disabled={currentAlbum === id}
              onClick={() => {
                setCurrentAlbum(id);
              }}
            >
              {name}
            </button>
          ))}
          <button
            style={{
              position: 'sticky',
              right: '.2em',
              margin: '.2em',
              marginLeft: 'auto',
            }}
            onClick={() => {
              const id = uid();
              setAlbums([...albums, { id, name: 'new', images: [] }]);
              setCurrentAlbum(id);
            }}
          >
            Create Album
          </button>
        </nav>
      </div>
      {!!currentAlbum && (
        <Album
          setAlbums={setAlbums}
          removeFromAlbum={removeFromAlbum}
          {...albums.find((a) => a.id === currentAlbum)}
        />
      )}

      {!!currentAlbum && (
        <div className="container">
          <DropZone onAddImage={addImage} />
          <UploadField onAddImage={addImage} />

          <section title="Picture for album">
            {images.map((file) => (
              <ListEntry
                key={file.name}
                file={file}
                onAddToAlbum={onAddToAlbum}
                removeImage={removeImage}
              />
            ))}
          </section>
        </div>
      )}
    </main>
  );
};
const domContainer = document.querySelector('#root');
const root = ReactDOM.createRoot(domContainer);
root.render(<Main />);
